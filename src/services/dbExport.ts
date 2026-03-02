import type { Client } from 'pg';

export type DbExportMode = 'schema' | 'bootstrap';

export interface DbExportOptions {
  mode?: DbExportMode;
  includeData?: boolean;
  includeRls?: boolean;
  seedTables?: string[];
}

const DEFAULT_SEED_TABLES = [
  'admin_permissions',
  'admin_policies',
  'admin_role_permissions',
  'admin_roles',
  'integration_configs',
  'sys_api_definitions'
];

export async function generateDatabaseExport(db: Client, options: DbExportOptions = {}) {
  const mode: DbExportMode = options.mode ?? 'schema';
  const includeData = options.includeData ?? (mode === 'bootstrap');
  const includeRls = options.includeRls ?? false;
  const seedTables = (options.seedTables ?? DEFAULT_SEED_TABLES)
    .map(t => t.trim())
    .filter(Boolean);

  const escapeSqlString = (value: string) => value.replace(/'/g, "''");
  const qIdent = (ident: string) => `"${ident.replace(/"/g, '""')}"`;
  const fqPublic = (name: string) => `public.${qIdent(name)}`;
  const isNextvalDefault = (expr: string) => /^nextval\('.*'::regclass\)$/.test(expr);
  const mapSerialType = (baseType: string) => {
    if (baseType === 'integer') return 'serial';
    if (baseType === 'bigint') return 'bigserial';
    if (baseType === 'smallint') return 'smallserial';
    return null;
  };

  const getExtensions = async () => {
    const { rows } = await db.query(`
      SELECT e.extname, n.nspname AS schema
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname <> 'plpgsql'
      ORDER BY e.extname;
    `);
    return rows as { extname: string; schema: string }[];
  };

  const getEnums = async () => {
    const { rows } = await db.query(`
      SELECT
        n.nspname AS schema,
        t.typname AS name,
        json_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY n.nspname, t.typname
      ORDER BY t.typname;
    `);
    return rows as { schema: string; name: string; labels: string[] }[];
  };

  const getTables = async () => {
    const { rows } = await db.query(`
      SELECT c.oid, c.relname AS name, pg_catalog.obj_description(c.oid, 'pg_class') AS comment
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r' AND n.nspname = 'public'
      ORDER BY c.relname;
    `);
    return rows as { oid: string; name: string; comment: string | null }[];
  };

  const getTableColumns = async (tableOid: string) => {
    const { rows } = await db.query(
      `
        SELECT
          a.attnum,
          a.attname,
          pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
          a.attnotnull,
          a.attidentity,
          pg_get_expr(ad.adbin, ad.adrelid) AS column_default,
          pg_catalog.col_description(a.attrelid, a.attnum) AS column_comment
        FROM pg_catalog.pg_attribute a
        LEFT JOIN pg_catalog.pg_attrdef ad
          ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
        WHERE a.attrelid = $1::oid
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY a.attnum;
      `,
      [tableOid]
    );
    return rows as Array<{
      attnum: number;
      attname: string;
      data_type: string;
      attnotnull: boolean;
      attidentity: '' | 'a' | 'd';
      column_default: string | null;
      column_comment: string | null;
    }>;
  };

  const getPrimaryKey = async (tableOid: string) => {
    const { rows } = await db.query(
      `
        SELECT a.attname
        FROM pg_index i
        JOIN unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON TRUE
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE i.indrelid = $1::oid AND i.indisprimary
        ORDER BY k.ord;
      `,
      [tableOid]
    );
    return rows.map((r: { attname: string }) => r.attname);
  };

  const getConstraints = async (tableOid: string, types: Array<'u' | 'c' | 'f'>) => {
    const { rows } = await db.query(
      `
        SELECT conname, contype, pg_get_constraintdef(oid, true) AS definition
        FROM pg_constraint
        WHERE conrelid = $1::oid
          AND contype = ANY($2::char[])
        ORDER BY contype, conname;
      `,
      [tableOid, types]
    );
    return rows as Array<{ conname: string; contype: string; definition: string }>;
  };

  const getNonConstraintIndexes = async (tableName: string) => {
    const { rows } = await db.query(
      `
        SELECT
          idx.relname AS indexname,
          pg_get_indexdef(i.indexrelid) AS indexdef
        FROM pg_index i
        JOIN pg_class tbl ON tbl.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = tbl.relnamespace
        JOIN pg_class idx ON idx.oid = i.indexrelid
        LEFT JOIN pg_constraint con ON con.conindid = i.indexrelid
        WHERE n.nspname = 'public'
          AND tbl.relname = $1
          AND con.oid IS NULL
        ORDER BY idx.relname;
      `,
      [tableName]
    );
    return rows as Array<{ indexname: string; indexdef: string }>;
  };

  const getFunctions = async () => {
    const { rows } = await db.query(`
      SELECT pg_get_functiondef(f.oid) AS definition
      FROM pg_catalog.pg_proc f
      JOIN pg_catalog.pg_namespace n ON f.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY f.proname, f.oid;
    `);
    return rows as { definition: string }[];
  };

  const getTriggers = async () => {
    const { rows } = await db.query(`
      SELECT
        c.relname AS table_name,
        t.tgname,
        pg_get_triggerdef(t.oid, true) AS definition
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
      ORDER BY c.relname, t.tgname;
    `);
    return rows as Array<{ table_name: string; tgname: string; definition: string }>;
  };

  const getViews = async () => {
    const { rows } = await db.query(`
      SELECT
        c.oid,
        c.relname AS name,
        pg_get_viewdef(c.oid, true) AS definition,
        pg_catalog.obj_description(c.oid, 'pg_class') AS comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'v'
      ORDER BY c.relname;
    `);
    return rows as Array<{ oid: string; name: string; definition: string; comment: string | null }>;
  };

  const getViewDependencies = async () => {
    const { rows } = await db.query(`
      SELECT
        v.oid AS view_oid,
        ref.oid AS ref_oid
      FROM pg_rewrite r
      JOIN pg_class v ON v.oid = r.ev_class
      JOIN pg_namespace nv ON nv.oid = v.relnamespace
      JOIN pg_depend d ON d.objid = r.oid
      JOIN pg_class ref ON ref.oid = d.refobjid
      JOIN pg_namespace nr ON nr.oid = ref.relnamespace
      WHERE nv.nspname = 'public'
        AND v.relkind = 'v'
        AND nr.nspname = 'public'
        AND ref.relkind = 'v';
    `);
    return rows as Array<{ view_oid: string; ref_oid: string }>;
  };

  const topoSortNames = (nodes: string[], edges: Array<{ from: string; to: string }>) => {
    const nodeSet = new Set(nodes);
    const inDegree = new Map<string, number>();
    const out = new Map<string, Set<string>>();

    for (const n of nodes) {
      inDegree.set(n, 0);
      out.set(n, new Set());
    }

    for (const e of edges) {
      if (!nodeSet.has(e.from) || !nodeSet.has(e.to) || e.from === e.to) continue;
      out.get(e.to)!.add(e.from);
      inDegree.set(e.from, (inDegree.get(e.from) || 0) + 1);
    }

    const queue = nodes.filter(n => (inDegree.get(n) || 0) === 0).sort((a, b) => a.localeCompare(b));
    const ordered: string[] = [];

    while (queue.length) {
      const current = queue.shift()!;
      ordered.push(current);
      for (const dep of out.get(current) || []) {
        inDegree.set(dep, (inDegree.get(dep) || 0) - 1);
        if (inDegree.get(dep) === 0) queue.push(dep);
      }
      queue.sort((a, b) => a.localeCompare(b));
    }

    if (ordered.length !== nodes.length) {
      const remaining = nodes.filter(n => !ordered.includes(n)).sort((a, b) => a.localeCompare(b));
      return [...ordered, ...remaining];
    }
    return ordered;
  };

  const getSeedDependencies = async (names: string[]) => {
    if (names.length === 0) return [] as Array<{ from: string; to: string }>;
    const { rows } = await db.query(
      `
        SELECT child.relname AS child, parent.relname AS parent
        FROM pg_constraint con
        JOIN pg_class child ON child.oid = con.conrelid
        JOIN pg_namespace nchild ON nchild.oid = child.relnamespace
        JOIN pg_class parent ON parent.oid = con.confrelid
        JOIN pg_namespace nparent ON nparent.oid = parent.relnamespace
        WHERE con.contype = 'f'
          AND nchild.nspname = 'public'
          AND nparent.nspname = 'public'
          AND child.relname = ANY($1::text[])
          AND parent.relname = ANY($1::text[])
      `,
      [names]
    );
    return rows.map(r => ({ from: r.child as string, to: r.parent as string }));
  };

  const getPolicies = async () => {
    const { rows } = await db.query(`
      SELECT
        c.relname AS table_name,
        p.polname,
        p.polcmd,
        p.polpermissive,
        pg_get_expr(p.polqual, p.polrelid) AS using_expr,
        pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expr,
        COALESCE(
          json_agg(r.rolname ORDER BY r.rolname) FILTER (WHERE r.rolname IS NOT NULL),
          '[]'::json
        ) AS roles
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN LATERAL unnest(p.polroles) AS role_oid(oid) ON TRUE
      LEFT JOIN pg_roles r ON r.oid = role_oid.oid
      WHERE n.nspname = 'public'
      GROUP BY c.relname, p.polname, p.polcmd, p.polpermissive, p.polqual, p.polwithcheck, p.polrelid
      ORDER BY c.relname, p.polname;
    `);
    return rows as Array<{
      table_name: string;
      polname: string;
      polcmd: string;
      polpermissive: boolean;
      using_expr: string | null;
      with_check_expr: string | null;
      roles: string[] | null;
    }>;
  };

  const getRlsTables = async () => {
    const { rows } = await db.query(`
      SELECT c.relname AS table_name, c.relrowsecurity AS enabled, c.relforcerowsecurity AS forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND (c.relrowsecurity OR c.relforcerowsecurity)
      ORDER BY c.relname;
    `);
    return rows as Array<{ table_name: string; enabled: boolean; forced: boolean }>;
  };

  const renderPolicyCommand = (cmd: string) => {
    if (cmd === '*') return 'ALL';
    if (cmd === 'r') return 'SELECT';
    if (cmd === 'a') return 'INSERT';
    if (cmd === 'w') return 'UPDATE';
    if (cmd === 'd') return 'DELETE';
    return 'ALL';
  };

  const renderPolicyRoles = (roles: unknown) => {
    const list = Array.isArray(roles) ? (roles as string[]) : [];
    if (list.length === 0) return 'public';
    return list.map(r => (r === 'public' ? 'public' : qIdent(r))).join(', ');
  };

  const exportSeedData = async (tablesByName: Map<string, { oid: string; name: string }>) => {
    const existing = seedTables.filter(t => tablesByName.has(t));
    if (existing.length === 0) return '';

    const deps = await getSeedDependencies(existing);
    const order = topoSortNames(existing, deps.map(d => ({ from: d.from, to: d.to }))).reverse();
    let out = `-- \n-- Seed Data\n-- \n\n`;

    for (const tableName of order) {
      const table = tablesByName.get(tableName);
      if (!table) continue;

      const columns = await getTableColumns(table.oid);
      const exportCols = columns.filter(c => c.attidentity !== 'a').map(c => c.attname);
      if (exportCols.length === 0) continue;

      const pkCols = await getPrimaryKey(table.oid);
      const orderCols = pkCols.length > 0 ? pkCols : exportCols;
      const orderBy = orderCols.map(c => qIdent(c)).join(', ');

      const insertCols = exportCols.map(qIdent).join(', ');
      const quoteExprs = exportCols.map(c => `quote_nullable(${qIdent(c)})`).join(', ');

      const stmtQuery = `
        SELECT
          'INSERT INTO ${fqPublic(tableName)} (${insertCols}) VALUES (' ||
          array_to_string(ARRAY[${quoteExprs}], ', ') ||
          ') ON CONFLICT DO NOTHING;' AS stmt
        FROM ${fqPublic(tableName)}
        ORDER BY ${orderBy};
      `;

      const { rows } = await db.query(stmtQuery);
      if (rows.length === 0) continue;

      out += `-- Seed: ${fqPublic(tableName)}\n`;
      for (const r of rows) out += `${r.stmt}\n`;
      out += `\n`;
    }

    return out;
  };

  const topoSort = <T extends { oid: string; name?: string }>(nodes: T[], edges: Array<{ from: string; to: string }>) => {
    const nodeMap = new Map(nodes.map(n => [n.oid, n]));
    const inDegree = new Map<string, number>();
    const out = new Map<string, Set<string>>();

    for (const n of nodes) {
      inDegree.set(n.oid, 0);
      out.set(n.oid, new Set());
    }

    for (const e of edges) {
      if (!nodeMap.has(e.from) || !nodeMap.has(e.to) || e.from === e.to) continue;
      out.get(e.to)!.add(e.from);
      inDegree.set(e.from, (inDegree.get(e.from) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [oid, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(oid);
    }
    queue.sort((a, b) => (nodeMap.get(a)?.name || '').localeCompare(nodeMap.get(b)?.name || ''));

    const ordered: T[] = [];
    while (queue.length) {
      const current = queue.shift()!;
      ordered.push(nodeMap.get(current)!);
      for (const dep of out.get(current) || []) {
        inDegree.set(dep, (inDegree.get(dep) || 0) - 1);
        if (inDegree.get(dep) === 0) queue.push(dep);
      }
      queue.sort((a, b) => (nodeMap.get(a)?.name || '').localeCompare(nodeMap.get(b)?.name || ''));
    }

    if (ordered.length !== nodes.length) {
      const remaining = nodes
        .filter(n => !ordered.includes(n))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return [...ordered, ...remaining];
    }
    return ordered;
  };

  const now = new Date();
  let fullScript = `-- Database Export\n-- Generated at ${now.toISOString()}\n\n`;
  fullScript += `SET statement_timeout = 0;\nSET lock_timeout = 0;\nSET idle_in_transaction_session_timeout = 0;\nSET client_encoding = 'UTF8';\nSET standard_conforming_strings = on;\nSET check_function_bodies = false;\nSET client_min_messages = warning;\nSET search_path = public;\n\n`;
  fullScript += `CREATE SCHEMA IF NOT EXISTS public;\n\n`;

  const extensions = await getExtensions();
  if (extensions.length > 0) {
    fullScript += `-- \n-- Extensions\n-- \n\n`;
    const schemas = Array.from(new Set(extensions.map(e => e.schema))).sort((a, b) => a.localeCompare(b));
    for (const schema of schemas) {
      if (schema !== 'public') fullScript += `CREATE SCHEMA IF NOT EXISTS ${qIdent(schema)};\n`;
    }
    if (schemas.some(s => s !== 'public')) fullScript += `\n`;
    for (const ext of extensions) {
      fullScript += `CREATE EXTENSION IF NOT EXISTS ${qIdent(ext.extname)} WITH SCHEMA ${qIdent(ext.schema)};\n`;
    }
    fullScript += `\n`;
  }

  const enums = await getEnums();
  if (enums.length > 0) {
    fullScript += `-- \n-- Types (Enums)\n-- \n\n`;
    for (const e of enums) {
      const labels = (Array.isArray(e.labels) ? e.labels : []).map(l => `'${escapeSqlString(l)}'`).join(', ');
      fullScript += `DO $$ BEGIN\n  CREATE TYPE ${qIdent(e.schema)}.${qIdent(e.name)} AS ENUM (${labels});\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;\n\n`;
    }
  }

  const functions = await getFunctions();
  if (functions.length > 0) {
    fullScript += `-- \n-- Functions & Procedures\n-- \n\n`;
    for (const func of functions) fullScript += `${func.definition};\n\n`;
  }

  const tables = await getTables();
  const tablesByName = new Map(tables.map(t => [t.name, { oid: t.oid, name: t.name }]));
  const fkStatements: string[] = [];
  const constraintStatements: string[] = [];
  const indexStatements: string[] = [];

  fullScript += `-- \n-- Tables\n-- \n\n`;
  for (const table of tables) {
    const columns = await getTableColumns(table.oid);
    const pkCols = await getPrimaryKey(table.oid);

    fullScript += `-- Table: ${fqPublic(table.name)}\n`;
    fullScript += `CREATE TABLE IF NOT EXISTS ${fqPublic(table.name)} (\n`;

    const colLines = columns.map(col => {
      let typeName = col.data_type;
      let defaultExpr = col.column_default;

      if (defaultExpr && isNextvalDefault(defaultExpr)) {
        const serialType = mapSerialType(typeName);
        if (serialType) {
          typeName = serialType;
          defaultExpr = null;
        }
      }

      let line = `  ${qIdent(col.attname)} ${typeName}`;
      if (col.attidentity === 'a') line += ' GENERATED ALWAYS AS IDENTITY';
      if (col.attidentity === 'd') line += ' GENERATED BY DEFAULT AS IDENTITY';
      if (col.attnotnull) line += ' NOT NULL';
      if (defaultExpr && !col.attidentity) line += ` DEFAULT ${defaultExpr}`;
      return line;
    });

    if (pkCols.length > 0) {
      colLines.push(`  CONSTRAINT ${qIdent(`${table.name}_pkey`)} PRIMARY KEY (${pkCols.map(qIdent).join(', ')})`);
    }

    fullScript += `${colLines.join(',\n')}\n);\n\n`;

    if (table.comment) {
      fullScript += `COMMENT ON TABLE ${fqPublic(table.name)} IS '${escapeSqlString(table.comment)}';\n`;
    }
    for (const col of columns) {
      if (col.column_comment) {
        fullScript += `COMMENT ON COLUMN ${fqPublic(table.name)}.${qIdent(col.attname)} IS '${escapeSqlString(col.column_comment)}';\n`;
      }
    }
    if (table.comment || columns.some(c => c.column_comment)) fullScript += `\n`;

    const constraints = await getConstraints(table.oid, ['u', 'c', 'f']);
    for (const con of constraints) {
      const stmt = `ALTER TABLE ONLY ${fqPublic(table.name)} ADD CONSTRAINT ${qIdent(con.conname)} ${con.definition};`;
      if (con.contype === 'f') fkStatements.push(stmt);
      else constraintStatements.push(stmt);
    }

    const idxs = await getNonConstraintIndexes(table.name);
    for (const idx of idxs) indexStatements.push(`${idx.indexdef};`);
  }

  if (constraintStatements.length > 0) {
    fullScript += `-- \n-- Table Constraints (Unique/Check)\n-- \n\n`;
    for (const stmt of constraintStatements.sort()) fullScript += `${stmt}\n`;
    fullScript += `\n`;
  }

  if (indexStatements.length > 0) {
    fullScript += `-- \n-- Indexes\n-- \n\n`;
    for (const stmt of indexStatements.sort()) fullScript += `${stmt}\n`;
    fullScript += `\n`;
  }

  if (includeData) {
    fullScript += await exportSeedData(tablesByName);
  }

  if (fkStatements.length > 0) {
    fullScript += `-- \n-- Foreign Keys\n-- \n\n`;
    for (const stmt of fkStatements.sort()) fullScript += `${stmt}\n`;
    fullScript += `\n`;
  }

  const triggers = await getTriggers();
  if (triggers.length > 0) {
    fullScript += `-- \n-- Triggers\n-- \n\n`;
    for (const t of triggers) fullScript += `${t.definition};\n`;
    fullScript += `\n`;
  }

  const views = await getViews();
  if (views.length > 0) {
    const deps = await getViewDependencies();
    const viewOrder = topoSort(
      views,
      deps.map(d => ({ from: d.view_oid, to: d.ref_oid }))
    );

    fullScript += `-- \n-- Views\n-- \n\n`;
    for (const v of viewOrder) {
      fullScript += `CREATE OR REPLACE VIEW ${fqPublic(v.name)} AS\n${v.definition}\n;\n\n`;
      if (v.comment) fullScript += `COMMENT ON VIEW ${fqPublic(v.name)} IS '${escapeSqlString(v.comment)}';\n\n`;
    }
  }

  if (includeRls) {
    const policies = await getPolicies();
    const rlsTables = await getRlsTables();
    const enableStatements: string[] = [];

    if (policies.length > 0) {
      fullScript += `-- \n-- RLS Policies\n-- \n\n`;
      for (const p of policies) {
        const tableRef = fqPublic(p.table_name);
        const cmd = renderPolicyCommand(p.polcmd);
        const asClause = p.polpermissive ? 'PERMISSIVE' : 'RESTRICTIVE';
        const rolesClause = renderPolicyRoles(p.roles);
        const usingClause = p.using_expr ? ` USING (${p.using_expr})` : '';
        const checkClause = p.with_check_expr ? ` WITH CHECK (${p.with_check_expr})` : '';

        fullScript += `DROP POLICY IF EXISTS ${qIdent(p.polname)} ON ${tableRef};\n`;
        fullScript += `CREATE POLICY ${qIdent(p.polname)} ON ${tableRef} AS ${asClause} FOR ${cmd} TO ${rolesClause}${usingClause}${checkClause};\n\n`;
      }
    }

    if (rlsTables.length > 0) {
      fullScript += `-- \n-- RLS Enablement\n-- \n\n`;
      for (const t of rlsTables) {
        const tableRef = fqPublic(t.table_name);
        if (t.enabled) enableStatements.push(`ALTER TABLE ${tableRef} ENABLE ROW LEVEL SECURITY;`);
        if (t.forced) enableStatements.push(`ALTER TABLE ${tableRef} FORCE ROW LEVEL SECURITY;`);
      }
      for (const stmt of enableStatements) fullScript += `${stmt}\n`;
      fullScript += `\n`;
    }
  }

  return fullScript;
}

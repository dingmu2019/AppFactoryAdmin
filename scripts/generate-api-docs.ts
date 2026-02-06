import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

type TableColumn = {
  name: string;
  dbType: string;
  description?: string;
};

type TableMeta = {
  table: string;
  columns: Record<string, TableColumn>;
};

type ApiDefinitionRow = {
  id: string;
  path: string;
  method: string;
  summary: string | null;
  description: string | null;
  category: string | null;
  auth_required: boolean | null;
  is_active: boolean | null;
  request_schema: any | null;
  response_schema: any | null;
};

type ParamRow = {
  name: string;
  in: 'header' | 'path' | 'query' | 'body';
  type: string;
  required: boolean;
  default?: any;
  description?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase URL or Service Key. Check backend/.env');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function listFilesRecursive(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const res: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) res.push(...listFilesRecursive(full));
    else res.push(full);
  }
  return res;
}

function parseTableMetadata(migrationsDir: string): Record<string, TableMeta> {
  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .map(f => path.join(migrationsDir, f));

  const tables: Record<string, TableMeta> = {};

  for (const file of files) {
    const sql = fs.readFileSync(file, 'utf8');

    const createTableRegex =
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);\s*/g;
    let m: RegExpExecArray | null;
    while ((m = createTableRegex.exec(sql))) {
      const table = m[1];
      const body = m[2];
      if (!tables[table]) tables[table] = { table, columns: {} };

      const lines = body
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .filter(l => !l.startsWith('--'));

      for (const line of lines) {
        const cleaned = line.replace(/,$/, '');
        if (
          cleaned.toUpperCase().startsWith('PRIMARY ') ||
          cleaned.toUpperCase().startsWith('CONSTRAINT ') ||
          cleaned.toUpperCase().startsWith('UNIQUE ') ||
          cleaned.toUpperCase().startsWith('FOREIGN ') ||
          cleaned.toUpperCase().startsWith('CHECK ') ||
          cleaned.toUpperCase().startsWith('EXCLUDE ')
        ) {
          continue;
        }

        const colMatch = cleaned.match(/^([a-zA-Z0-9_]+)\s+(.+?)\s*(--.*)?$/);
        if (!colMatch) continue;
        const name = colMatch[1];
        const typePart = colMatch[2];
        const dbType = typePart.split(/\s+/)[0];
        if (!tables[table].columns[name]) {
          tables[table].columns[name] = { name, dbType };
        }
      }
    }

    const commentRegex = /COMMENT\s+ON\s+COLUMN\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s+IS\s+'([^']*)';/g;
    let c: RegExpExecArray | null;
    while ((c = commentRegex.exec(sql))) {
      const table = c[1];
      const column = c[2];
      const desc = c[3];
      if (!tables[table]) tables[table] = { table, columns: {} };
      if (!tables[table].columns[column]) tables[table].columns[column] = { name: column, dbType: 'text' };
      tables[table].columns[column].description = desc;
    }
  }

  return tables;
}

function readText(filePath: string) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractBalancedBlock(text: string, startIndex: number) {
  let i = startIndex;
  let depth = 0;
  let started = false;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      depth++;
      started = true;
    } else if (ch === '}') {
      depth--;
      if (started && depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }
  return null;
}

function extractExportedFunctionBody(fileContent: string, fnName: string) {
  const idx = fileContent.indexOf(`export const ${fnName}`);
  if (idx === -1) return null;
  const arrowIdx = fileContent.indexOf('=>', idx);
  if (arrowIdx === -1) return null;
  const braceIdx = fileContent.indexOf('{', arrowIdx);
  if (braceIdx === -1) return null;
  const block = extractBalancedBlock(fileContent, braceIdx);
  if (!block) return null;
  return block;
}

function inferParamType(name: string, column?: TableColumn) {
  if (column) {
    const t = column.dbType.toLowerCase();
    if (t.includes('uuid')) return 'string(uuid)';
    if (t.includes('int')) return 'integer';
    if (t.includes('bool')) return 'boolean';
    if (t.includes('json')) return 'object';
    if (t.includes('timestamp') || t.includes('date')) return 'string(date-time)';
    if (t.includes('float') || t.includes('numeric') || t.includes('double')) return 'number';
  }
  if (name === 'id' || name.endsWith('_id') || name.endsWith('Id')) return 'string(uuid)';
  if (['page', 'pageSize', 'limit', 'offset', 'duration', 'entropy', 'count'].includes(name)) return 'integer';
  if (name.startsWith('is_') || name.startsWith('has_')) return 'boolean';
  return 'string';
}

function inferAuthScheme(fullPath: string, authRequired: boolean | null) {
  if (!authRequired) return { type: 'none' as const };
  if (fullPath.startsWith('/api/v1/')) return { type: 'appKey' as const };
  return { type: 'bearer' as const };
}

function markdownTable(rows: Array<Record<string, any>>, columns: string[]) {
  const header = `| ${columns.join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows
    .map(r => `| ${columns.map(c => (r[c] ?? '')).join(' | ')} |`)
    .join('\n');
  return [header, sep, body].filter(Boolean).join('\n');
}

function buildMarkdownForParams(params: ParamRow[]) {
  if (params.length === 0) return '无';
  const rows = params.map(p => ({
    参数: p.name,
    位置: p.in,
    类型: p.type,
    必填: p.required ? '是' : '否',
    默认值: p.default ?? '',
    说明: p.description ?? ''
  }));
  return markdownTable(rows, ['参数', '位置', '类型', '必填', '默认值', '说明']);
}

function flattenSchemaProperties(schema: any, prefix = ''): Array<{ field: string; type: string; required: boolean; description?: string }> {
  if (!schema || typeof schema !== 'object') return [];
  const type = schema.type;
  if (type === 'object' && schema.properties && typeof schema.properties === 'object') {
    const requiredSet = new Set<string>(Array.isArray(schema.required) ? schema.required : []);
    const out: Array<{ field: string; type: string; required: boolean; description?: string }> = [];
    for (const [k, v] of Object.entries(schema.properties)) {
      const fieldName = prefix ? `${prefix}.${k}` : k;
      const vAny: any = v;
      const vType = Array.isArray(vAny.type) ? vAny.type.join('|') : vAny.type || (vAny.$ref ? 'ref' : 'object');
      out.push({
        field: fieldName,
        type: vAny.format ? `${vType}(${vAny.format})` : vType,
        required: requiredSet.has(k),
        description: vAny.description
      });
      out.push(...flattenSchemaProperties(vAny, fieldName));
    }
    return out;
  }
  if (type === 'array' && schema.items) {
    return flattenSchemaProperties(schema.items, prefix ? `${prefix}[]` : '[]');
  }
  return [];
}

function buildMarkdownForResponses(resp: any) {
  const statuses = Object.keys(resp || {}).filter(k => k !== 'markdown').sort();
  if (statuses.length === 0) return '无';

  const parts: string[] = [];
  for (const status of statuses) {
    const entry = resp[status];
    const desc = entry?.description || '';
    parts.push(`### ${status}${desc ? ` - ${desc}` : ''}`);
    const schema = entry?.schema;
    if (!schema) {
      parts.push('无');
      continue;
    }

    if (schema.type === 'array' && schema.items) {
      parts.push('返回数组，元素结构如下：');
      const rows = flattenSchemaProperties(schema.items).map(r => ({
        字段: r.field,
        类型: r.type,
        必填: r.required ? '是' : '否',
        说明: r.description ?? ''
      }));
      parts.push(markdownTable(rows, ['字段', '类型', '必填', '说明']));
    } else {
      const rows = flattenSchemaProperties(schema).map(r => ({
        字段: r.field,
        类型: r.type,
        必填: r.required ? '是' : '否',
        说明: r.description ?? ''
      }));
      parts.push(markdownTable(rows, ['字段', '类型', '必填', '说明']));
    }
  }
  return parts.join('\n\n');
}

function buildMarkdownForBodySchema(bodySchema: any) {
  if (!bodySchema || typeof bodySchema !== 'object') return '';
  const schema = bodySchema.schema ? bodySchema.schema : bodySchema;
  if (!schema || typeof schema !== 'object') return '';
  const rows = flattenSchemaProperties(schema).map(r => ({
    参数: r.field,
    位置: 'body',
    类型: r.type,
    必填: r.required ? '是' : '否',
    默认值: '',
    说明: r.description ?? ''
  }));
  if (rows.length === 0) return '';
  return markdownTable(rows, ['参数', '位置', '类型', '必填', '默认值', '说明']);
}

function mergeObjectPreserveExisting(base: any, patch: any) {
  const out: any = { ...(base && typeof base === 'object' ? base : {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (out[k] === undefined || out[k] === null || (typeof out[k] === 'object' && Object.keys(out[k]).length === 0)) {
      out[k] = v;
    } else if (typeof out[k] === 'object' && typeof v === 'object' && !Array.isArray(out[k]) && !Array.isArray(v)) {
      out[k] = mergeObjectPreserveExisting(out[k], v);
    }
  }
  return out;
}

function buildSchemaFromTable(tableMeta: TableMeta, pickColumns?: string[]) {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  const columnNames = pickColumns && pickColumns.length > 0 ? pickColumns : Object.keys(tableMeta.columns);
  for (const col of columnNames) {
    const c = tableMeta.columns[col];
    if (!c) continue;
    const t = inferParamType(col, c);
    const schema: any = {};
    if (t === 'integer') schema.type = 'integer';
    else if (t === 'number') schema.type = 'number';
    else if (t === 'boolean') schema.type = 'boolean';
    else if (t.startsWith('string(')) {
      schema.type = 'string';
      const fmt = t.match(/^string\((.+)\)$/)?.[1];
      if (fmt) schema.format = fmt;
    } else if (t === 'object') schema.type = 'object';
    else schema.type = 'string';

    if (c.description) schema.description = c.description;
    properties[col] = schema;
  }
  return { type: 'object', properties, required };
}

function parseImportedBindings(routeFileContent: string) {
  const map = new Map<string, string>();
  const importRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = importRegex.exec(routeFileContent))) {
    const names = m[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.split(/\s+as\s+/)[0].trim());
    const from = m[2];
    for (const n of names) map.set(n, from);
  }
  return map;
}

function parseNamespaceImports(routeFileContent: string) {
  const map = new Map<string, string>();
  const nsRegex = /import\s+\*\s+as\s+([A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = nsRegex.exec(routeFileContent))) {
    map.set(m[1], m[2]);
  }
  return map;
}

function splitTopLevelArgs(argText: string) {
  const args: string[] = [];
  let current = '';
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  const push = () => {
    const trimmed = current.trim();
    if (trimmed) args.push(trimmed);
    current = '';
  };

  for (let i = 0; i < argText.length; i++) {
    const ch = argText[i];
    const next = argText[i + 1];

    if (inLineComment) {
      current += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      current += ch;
      if (ch === '*' && next === '/') {
        current += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === '/' && next === '/') {
        inLineComment = true;
        current += ch + next;
        i++;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        current += ch + next;
        i++;
        continue;
      }
    }

    if (!inDouble && !inTemplate && ch === "'" && argText[i - 1] !== '\\') inSingle = !inSingle;
    else if (!inSingle && !inTemplate && ch === '"' && argText[i - 1] !== '\\') inDouble = !inDouble;
    else if (!inSingle && !inDouble && ch === '`' && argText[i - 1] !== '\\') inTemplate = !inTemplate;

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === '(') depthParen++;
      else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
      else if (ch === '{') depthBrace++;
      else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
      else if (ch === '[') depthBracket++;
      else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);

      if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
        push();
        continue;
      }
    }

    current += ch;
  }

  push();
  return args;
}

function findCallBlocks(text: string, prefix: string) {
  const blocks: Array<{ start: number; end: number; inside: string }> = [];
  let idx = 0;
  while (true) {
    const found = text.indexOf(prefix, idx);
    if (found === -1) break;
    const parenIdx = text.indexOf('(', found + prefix.length);
    if (parenIdx === -1) break;
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let inLineComment = false;
    let inBlockComment = false;
    for (let i = parenIdx; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (inLineComment) {
        if (ch === '\n') inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          i++;
          inBlockComment = false;
        }
        continue;
      }

      if (!inSingle && !inDouble && !inTemplate) {
        if (ch === '/' && next === '/') {
          inLineComment = true;
          i++;
          continue;
        }
        if (ch === '/' && next === '*') {
          inBlockComment = true;
          i++;
          continue;
        }
      }

      if (!inDouble && !inTemplate && ch === "'" && text[i - 1] !== '\\') inSingle = !inSingle;
      else if (!inSingle && !inTemplate && ch === '"' && text[i - 1] !== '\\') inDouble = !inDouble;
      else if (!inSingle && !inDouble && ch === '`' && text[i - 1] !== '\\') inTemplate = !inTemplate;

      if (!inSingle && !inDouble && !inTemplate) {
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) {
            blocks.push({ start: found, end: i + 1, inside: text.slice(parenIdx + 1, i) });
            idx = i + 1;
            break;
          }
        }
      }
    }

    idx = Math.max(idx, found + prefix.length);
  }
  return blocks;
}

function joinRoutePath(base: string, sub: string) {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const s = sub === '/' ? '' : sub;
  if (!s) return b;
  if (s.startsWith('/')) return `${b}${s}`;
  return `${b}/${s}`;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const backendSrc = path.join(repoRoot, 'backend', 'src');
  const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');

  const tableMetaByName = parseTableMetadata(migrationsDir);

  const appFile = path.join(backendSrc, 'app.ts');
  const appText = readText(appFile);

  const importMap = new Map<string, string>();
  const importDefaultRegex = /import\s+([A-Za-z0-9_]+)\s+from\s+['"](.+?)['"]/g;
  let im: RegExpExecArray | null;
  while ((im = importDefaultRegex.exec(appText))) {
    importMap.set(im[1], im[2]);
  }

  const mounts: Array<{ basePath: string; modulePath: string }> = [];
  const useRegex = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*([A-Za-z0-9_]+)\s*\)/g;
  let um: RegExpExecArray | null;
  while ((um = useRegex.exec(appText))) {
    const basePath = um[1];
    const varName = um[2];
    const relModule = importMap.get(varName);
    if (!relModule) continue;
    const resolved = path.resolve(path.dirname(appFile), relModule);
    mounts.push({ basePath, modulePath: resolved });
  }

  type RouteHandlerRef =
    | { kind: 'named'; fnName: string; modulePath: string }
    | { kind: 'inline'; source: string; modulePath: string };

  const routeHandlers = new Map<string, RouteHandlerRef>();

  for (const mount of mounts) {
    if (!mount.modulePath.endsWith('.ts')) continue;
    if (!fs.existsSync(mount.modulePath)) continue;
    const routeText = readText(mount.modulePath);
    const namedImports = parseImportedBindings(routeText);
    const namespaceImports = parseNamespaceImports(routeText);

    const verbs = ['get', 'post', 'put', 'delete', 'patch'] as const;
    for (const v of verbs) {
      const blocks = findCallBlocks(routeText, `router.${v}`);
      for (const b of blocks) {
        const args = splitTopLevelArgs(b.inside);
        if (args.length < 2) continue;

        const rawPathArg = args[0];
        const subPathMatch = rawPathArg.match(/^['"]([^'"]*)['"]$/);
        if (!subPathMatch) continue;
        const subPath = subPathMatch[1] || '/';

        const handlerArg = args[args.length - 1];
        const method = v.toUpperCase();
        const fullPath = joinRoutePath(mount.basePath, subPath || '/');
        const key = `${method} ${fullPath}`;

        const namedMatch = handlerArg.match(/^([A-Za-z0-9_]+)\s*$/);
        if (namedMatch) {
          const fnName = namedMatch[1];
          const from = namedImports.get(fnName);
          if (from) {
            const resolved = path.resolve(path.dirname(mount.modulePath), from);
            routeHandlers.set(key, { kind: 'named', fnName, modulePath: resolved });
          } else {
            routeHandlers.set(key, { kind: 'named', fnName, modulePath: mount.modulePath });
          }
          continue;
        }

        const memberMatch = handlerArg.match(/^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\s*$/);
        if (memberMatch) {
          const ns = memberMatch[1];
          const fnName = memberMatch[2];
          const from = namespaceImports.get(ns);
          if (from) {
            const resolved = path.resolve(path.dirname(mount.modulePath), from);
            routeHandlers.set(key, { kind: 'named', fnName, modulePath: resolved });
          }
          continue;
        }

        const arrowIdx = handlerArg.indexOf('=>');
        if (arrowIdx !== -1) {
          const braceIdx = handlerArg.indexOf('{', arrowIdx);
          if (braceIdx !== -1) {
            const block = extractBalancedBlock(handlerArg, braceIdx);
            if (block) {
              routeHandlers.set(key, { kind: 'inline', source: block, modulePath: mount.modulePath });
            }
          }
        }
      }
    }
  }

  const { data: apiRows, error: apiErr } = await supabase
    .from('sys_api_definitions')
    .select('id,path,method,summary,description,category,auth_required,is_active,request_schema,response_schema');
  if (apiErr) throw apiErr;

  const rows = (apiRows || []) as unknown as ApiDefinitionRow[];

  let updated = 0;
  for (const row of rows) {
    const key = `${row.method.toUpperCase()} ${row.path}`;
    const handlerRef = routeHandlers.get(key);
    if (!handlerRef) {
      const existingBodyMd = buildMarkdownForBodySchema(row.request_schema?.body);
      const defaultNotImpl = '当前未在后端路由中发现实现（可能已下线或待接入）。';
      const shouldReplaceNotImpl = typeof row.request_schema?.markdown === 'string' && row.request_schema.markdown.trim() === defaultNotImpl;
      const nextMarkdown =
        shouldReplaceNotImpl && existingBodyMd
          ? [existingBodyMd, '', `> ${defaultNotImpl}`].join('\n')
          : row.request_schema?.markdown || (existingBodyMd ? [existingBodyMd, '', `> ${defaultNotImpl}`].join('\n') : defaultNotImpl);

      const notImplRequest = shouldReplaceNotImpl
        ? { ...(row.request_schema || {}), markdown: nextMarkdown, auth: inferAuthScheme(row.path, row.auth_required) }
        : mergeObjectPreserveExisting(row.request_schema, {
            markdown: nextMarkdown,
            auth: inferAuthScheme(row.path, row.auth_required)
          });
      const notImplResp = mergeObjectPreserveExisting(row.response_schema, {
        '501': {
          description: 'Not Implemented',
          schema: {
            type: 'object',
            required: ['error'],
            properties: {
              error: { type: 'string', description: '错误信息' },
              code: { type: 'string', description: '错误代码', example: 'NOT_IMPLEMENTED' },
              solution: { type: 'string', description: '建议解决方案', example: '该功能尚未开发完成' }
            }
          }
        },
        markdown: buildMarkdownForResponses({
          '501': {
            description: 'Not Implemented',
            schema: {
              type: 'object',
              required: ['error'],
              properties: {
                error: { type: 'string', description: '错误信息' },
                code: { type: 'string', description: '错误代码', example: 'NOT_IMPLEMENTED' },
                solution: { type: 'string', description: '建议解决方案', example: '该功能尚未开发完成' }
              }
            }
          }
        })
      });

      const { error: upErr } = await supabase
        .from('sys_api_definitions')
        .update({ request_schema: notImplRequest, response_schema: notImplResp })
        .eq('id', row.id);
      if (!upErr) updated++;
      continue;
    }

    let handlerBody: string | null = null;
    if (handlerRef.kind === 'inline') {
      handlerBody = handlerRef.source;
    } else {
      if (fs.existsSync(handlerRef.modulePath)) {
        const content = readText(handlerRef.modulePath);
        handlerBody = extractExportedFunctionBody(content, handlerRef.fnName);
      }
    }
    if (!handlerBody) continue;

    const auth = inferAuthScheme(row.path, row.auth_required);
    const params: ParamRow[] = [];

    if (auth.type === 'bearer') {
      params.push({
        name: 'Authorization',
        in: 'header',
        type: 'string',
        required: true,
        description: 'Bearer 访问令牌，例如：Bearer <access_token>'
      });
    } else if (auth.type === 'appKey') {
      params.push(
        { name: 'x-app-key', in: 'header', type: 'string', required: true, description: '应用标识（Client ID / App Key）' },
        { name: 'x-app-secret', in: 'header', type: 'string', required: true, description: '应用密钥（Client Secret / App Secret）' }
      );
    }

    const pathParams = [...row.path.matchAll(/:([A-Za-z0-9_]+)/g)].map(m => m[1]);
    for (const p of pathParams) {
      params.push({
        name: p,
        in: 'path',
        type: inferParamType(p),
        required: true,
        description: '路径参数'
      });
    }

    const queryNames = new Set<string>();
    for (const m of handlerBody.matchAll(/req\.query\.([A-Za-z0-9_]+)/g)) queryNames.add(m[1]);
    const queryDestructure = handlerBody.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.query/);
    if (queryDestructure) {
      for (const n of queryDestructure[1].split(',').map(s => s.trim()).filter(Boolean)) queryNames.add(n);
    }
    for (const q of queryNames) {
      params.push({
        name: q,
        in: 'query',
        type: inferParamType(q),
        required: false,
        description: '查询参数'
      });
    }

    const bodyNames = new Set<string>();
    for (const m of handlerBody.matchAll(/req\.body\.([A-Za-z0-9_]+)/g)) bodyNames.add(m[1]);
    const bodyDestructure = handlerBody.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.body/);
    if (bodyDestructure) {
      for (const n of bodyDestructure[1].split(',').map(s => s.trim()).filter(Boolean)) bodyNames.add(n);
    }

    const bodyIsArray = /Array\.isArray\(\s*([A-Za-z0-9_]+)\s*\)/.test(handlerBody) && /const\s+([A-Za-z0-9_]+)\s*=\s*req\.body/.test(handlerBody);
    if (bodyIsArray) {
      params.push({
        name: 'body',
        in: 'body',
        type: 'array<object>',
        required: true,
        description: '请求体为数组'
      });
    } else {
      for (const b of bodyNames) {
        params.push({
          name: b,
          in: 'body',
          type: inferParamType(b),
          required: false,
          description: '请求体字段'
        });
      }
    }

    const requestSchemaPatch: any = {
      auth,
      markdown: buildMarkdownForParams(params),
      headers: params.filter(p => p.in === 'header').map(p => ({ name: p.name, type: p.type, required: p.required, default: p.default, description: p.description })),
      path: params.filter(p => p.in === 'path').map(p => ({ name: p.name, type: p.type, required: p.required, default: p.default, description: p.description })),
      query: params.filter(p => p.in === 'query').map(p => ({ name: p.name, type: p.type, required: p.required, default: p.default, description: p.description })),
      body: bodyIsArray
        ? { type: 'array', description: '请求体为数组' }
        : params.filter(p => p.in === 'body').map(p => ({ name: p.name, type: p.type, required: p.required, default: p.default, description: p.description }))
    };

    const usedTable = handlerBody.match(/supabase\s*\.\s*from\(\s*'([^']+)'\s*\)/)?.[1];
    const tableMeta = usedTable ? tableMetaByName[usedTable] : undefined;

    const returnsArray =
      /res\.json\(\s*data\s*\|\|\s*\[\s*\]\s*\)/.test(handlerBody) ||
      /res\.json\(\s*data\s*\)/.test(handlerBody) && /\.single\(\)/.test(handlerBody) === false;
    const returnsSuccessObject = /res\.json\(\s*\{\s*success\s*:\s*true/.test(handlerBody);
    const hasSingle = /\.single\(\)/.test(handlerBody);
    const status201 = /res\.status\(\s*201\s*\)\.json/.test(handlerBody);

    const response: any = {};
    const okStatus = status201 ? '201' : '200';

    if (returnsSuccessObject) {
      response[okStatus] = {
        description: '操作成功',
        schema: {
          type: 'object',
          required: ['success'],
          properties: {
            success: { type: 'boolean', description: '是否成功' }
          }
        }
      };
    } else if (tableMeta) {
      const itemSchema = buildSchemaFromTable(tableMeta);
      if (returnsArray) {
        response[okStatus] = { description: '成功', schema: { type: 'array', items: itemSchema } };
      } else if (hasSingle) {
        response[okStatus] = { description: '成功', schema: itemSchema };
      } else {
        response[okStatus] = { description: '成功', schema: itemSchema };
      }
    } else {
      response[okStatus] = { description: '成功', schema: { type: 'object', properties: {} } };
    }

    if (/status\(\s*400\s*\)\.json/.test(handlerBody) || /return\s+res\.status\(\s*400/.test(handlerBody)) {
      response['400'] = {
        description: '请求参数错误',
        schema: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string', description: '错误信息' },
            code: { type: 'string', description: '错误代码', example: 'INVALID_PARAM' },
            solution: { type: 'string', description: '建议解决方案', example: '检查参数格式' }
          }
        }
      };
    }
    if (auth.type !== 'none') {
      response['401'] = {
        description: '未认证',
        schema: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string', description: '认证失败信息' },
            code: { type: 'string', description: '错误代码', example: 'UNAUTHORIZED' },
            solution: { type: 'string', description: '建议解决方案', example: '请提供有效的 Bearer Token' }
          }
        }
      };
      response['403'] = {
        description: '无权限',
        schema: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string', description: '权限拒绝信息' },
            code: { type: 'string', description: '错误代码', example: 'FORBIDDEN' },
            solution: { type: 'string', description: '建议解决方案', example: '联系管理员申请权限' }
          }
        }
      };
    }
    response['500'] = {
      description: '服务器内部错误',
      schema: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', description: '系统错误信息' },
          code: { type: 'string', description: '错误代码', example: 'INTERNAL_ERROR' },
          solution: { type: 'string', description: '建议解决方案', example: '请稍后重试或联系技术支持' }
        }
      }
    };

    const responseSchemaPatch: any = { ...response, markdown: buildMarkdownForResponses(response) };

    const nextRequestSchema = mergeObjectPreserveExisting(row.request_schema, requestSchemaPatch);
    const nextResponseSchema = mergeObjectPreserveExisting(row.response_schema, responseSchemaPatch);

    const { error: upErr } = await supabase
      .from('sys_api_definitions')
      .update({ request_schema: nextRequestSchema, response_schema: nextResponseSchema })
      .eq('id', row.id);
    if (!upErr) updated++;
  }

  console.log(`Updated sys_api_definitions: ${updated}/${rows.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

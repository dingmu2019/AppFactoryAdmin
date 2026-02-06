import express from 'express';
import { getDatabaseClient } from '../../lib/db/connection.ts';

const router = express.Router();

/**
 * @openapi
 * /api/database/schema:
 *   get:
 *     tags: [Database]
 *     summary: Get table schema
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Table schema details
 */
router.get('/', async (req, res) => {
  const tableName = req.query.table as string;

  if (!tableName) {
    return res.status(400).json({ error: 'Table name is required' });
  }

  let client;
  try {
    client = await getDatabaseClient();

    // 1. Table Info
    const tableQuery = `
      SELECT pg_catalog.obj_description(c.oid, 'pg_class') as comment
      FROM pg_catalog.pg_class c
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = $1;
    `;
    const tableRes = await client.query(tableQuery, [tableName]);
    const tableInfo = {
      name: tableName,
      comment: tableRes.rows[0]?.comment || null
    };

    // 2. Columns
    const columnsQuery = `
      SELECT
        a.attname as name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as type,
        (SELECT substring(pg_catalog.format_type(a.atttypid, a.atttypmod) from '\\((.*)\\)') ) as length,
        NOT a.attnotnull as nullable,
        (SELECT true FROM pg_constraint WHERE conrelid = c.oid AND conkey[1] = a.attnum AND contype = 'p') as is_pk,
        pg_catalog.col_description(c.oid, a.attnum) as comment
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = $1 AND n.nspname = 'public' AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum;
    `;
    const columnsRes = await client.query(columnsQuery, [tableName]);

    // 3. Indexes
    const indexesQuery = `
      SELECT
        i.relname as name,
        ix.indisunique as is_unique,
        pg_get_indexdef(ix.indexrelid) as definition
      FROM pg_class t, pg_class i, pg_index ix, pg_namespace n
      WHERE t.oid = ix.indrelid
      AND i.oid = ix.indexrelid
      AND t.relnamespace = n.oid
      AND t.relname = $1
      AND n.nspname = 'public';
    `;
    const indexesRes = await client.query(indexesQuery, [tableName]);

    // 4. Foreign Keys
    const fkQuery = `
        SELECT
            kcu.constraint_name as name,
            kcu.column_name as column,
            ccu.table_name AS ref_table,
            ccu.column_name AS ref_column
        FROM information_schema.key_column_usage AS kcu
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = kcu.constraint_name
            AND ccu.table_schema = kcu.table_schema
        WHERE kcu.table_schema = 'public' AND kcu.table_name = $1;
    `;
    const fkRes = await client.query(fkQuery, [tableName]);

    return res.json({
      table: tableInfo,
      columns: columnsRes.rows,
      indexes: indexesRes.rows,
      foreignKeys: fkRes.rows
    });

  } catch (error: any) {
    console.error('Database Schema Error:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    if (client) await client.end();
  }
});

export default router;

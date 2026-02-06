import express from 'express';
import type { Client } from 'pg';
import { getDatabaseClient } from '../../lib/db/connection.ts';
import { generateDatabaseExport } from '../../services/dbExport.ts';

const router = express.Router();

/**
 * @openapi
 * /api/database/export:
 *   get:
 *     tags: [Database]
 *     summary: Export database SQL
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [schema, bootstrap]
 *       - in: query
 *         name: includeData
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: includeRls
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: seedTables
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SQL dump
 */
router.get('/', async (req, res) => {
  let client: Client | null = null;
  try {
    client = await getDatabaseClient();
    const parseBool = (v: unknown) => {
      if (v === undefined || v === null) return undefined;
      const s = String(v).toLowerCase().trim();
      if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
      if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
      return undefined;
    };

    const mode = (String(req.query.mode || 'schema').toLowerCase() === 'bootstrap' ? 'bootstrap' : 'schema') as
      | 'schema'
      | 'bootstrap';
    const includeData = parseBool(req.query.includeData);
    const includeRls = parseBool(req.query.includeRls);
    const seedTablesRaw = typeof req.query.seedTables === 'string' ? req.query.seedTables : '';
    const seedTables = seedTablesRaw
      ? seedTablesRaw
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : undefined;

    const fullScript = await generateDatabaseExport(client, { mode, includeData, includeRls, seedTables });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="database_${mode}_export_${new Date().getTime()}.sql"`);
    res.send(fullScript);

  } catch (error: any) {
    console.error('Export Error:', error);
    console.error(error.stack);
    res.status(500).json({ error: error.message, stack: error.stack });
  } finally {
    if (client) await client.end();
  }
});

export default router;

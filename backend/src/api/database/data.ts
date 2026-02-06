import express from 'express';
import { getDatabaseClient } from '../../lib/db/connection.ts';

const router = express.Router();

/**
 * @openapi
 * /api/database/data:
 *   get:
 *     tags: [Database]
 *     summary: Get table data
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Table data
 */
router.get('/', async (req, res) => {
  const tableName = req.query.table as string;
  const page = parseInt((req.query.page as string) || '1');
  const pageSize = parseInt((req.query.pageSize as string) || '20');

  if (!tableName) {
    return res.status(400).json({ error: 'Table name is required' });
  }

  let client;
  try {
    client = await getDatabaseClient();

    // Sanitize table name: only allow alphanumeric and underscore, or quote it properly
    // Simple quoting for Postgres
    const safeTableName = `"${tableName.replace(/"/g, '""')}"`;

    // 1. Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${safeTableName}`;
    const countRes = await client.query(countQuery);
    const total = parseInt(countRes.rows[0].total);

    // 2. Get data
    const offset = (page - 1) * pageSize;
    const dataQuery = `SELECT * FROM ${safeTableName} LIMIT $1 OFFSET $2`;
    const dataRes = await client.query(dataQuery, [pageSize, offset]);

    return res.json({
      data: dataRes.rows,
      pagination: {
        page,
        pageSize,
        total
      }
    });

  } catch (error: any) {
    console.error('Database Data Error:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    if (client) await client.end();
  }
});

export default router;

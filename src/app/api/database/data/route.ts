
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient, closeDatabaseClient } from '@/lib/db';
import { requireDatabaseAdmin } from '../_auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tableName = searchParams.get('table');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  if (!tableName) {
    return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
  }

  let client;
  try {
    const auth = await requireDatabaseAdmin(req);
    if (auth instanceof NextResponse) return auth;

    client = await getDatabaseClient();

    // --- SECURITY: TABLE NAME WHITELIST CHECK ---
    // Prevent SQL Injection by verifying the table exists in the public schema
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      ) as exists
    `;
    const checkRes = await client.query(checkTableQuery, [tableName]);
    if (!checkRes.rows[0].exists) {
      return NextResponse.json({ error: 'Invalid table name or table not found in public schema' }, { status: 400 });
    }

    // Sanitize table name: only allow alphanumeric and underscore, or quote it properly
    const safeTableName = `"${tableName.replace(/"/g, '""')}"`;

    // 1. Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${safeTableName}`;
    const countRes = await client.query(countQuery);
    const total = parseInt(countRes.rows[0].total);

    // 2. Get data
    const offset = (page - 1) * pageSize;
    const dataQuery = `SELECT * FROM ${safeTableName} LIMIT $1 OFFSET $2`;
    const dataRes = await client.query(dataQuery, [pageSize, offset]);

    return NextResponse.json({
      data: dataRes.rows,
      pagination: {
        page,
        pageSize,
        total
      }
    });

  } catch (error: any) {
    console.error('Database Data Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await closeDatabaseClient(client);
  }
}

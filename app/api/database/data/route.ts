import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '../../../../lib/db/connection';

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
    if (client) await client.end();
  }
}

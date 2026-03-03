
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient, closeDatabaseClient } from '@/lib/db';
import { requireDatabaseAdmin } from '../_auth';

export async function GET(req: NextRequest) {
  let client;
  try {
    const auth = await requireDatabaseAdmin(req);
    if (auth instanceof NextResponse) return auth;

    client = await getDatabaseClient();

    const query = `
      SELECT 
        c.relname as name,
        pg_catalog.obj_description(c.oid, 'pg_class') as comment
      FROM pg_catalog.pg_class c
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r','p') -- r = ordinary table, p = partitioned table
      AND n.nspname = 'public'
      ORDER BY 1;
    `;

    const result = await client.query(query);
    
    const columnsQuery = `
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
    `;
    const columnsResult = await client.query(columnsQuery);
    
    const tableColumns: Record<string, string[]> = {};
    columnsResult.rows.forEach((row: any) => {
        if (!tableColumns[row.table_name]) tableColumns[row.table_name] = [];
        tableColumns[row.table_name].push(row.column_name);
    });

    const tables = result.rows.map((row: any) => ({
      name: row.name,
      comment: row.comment,
      columns: tableColumns[row.name] || []
    }));

    return NextResponse.json(tables);
  } catch (error: any) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await closeDatabaseClient(client);
  }
}

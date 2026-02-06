import { NextResponse } from 'next/server';
import { getDatabaseClient } from '../../../../lib/db/connection';

export async function GET() {
  let client;
  try {
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
    
    // Also fetch column names for search optimization (optional, but good for the requirement "search by field name")
    // Let's just return tables first. The frontend requirement says "search matches field name".
    // To support that efficiently, we might want to return columns summary or handle search on backend.
    // Let's fetch all columns for all tables to build a search index on frontend, or do a joined query.
    // For simplicity and performance on large DBs, maybe just fetching tables is enough, but to support the feature:
    // "When search keyword matches a field name... show 'Match Field' tag"
    // I'll fetch a map of table -> columns.
    
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
    if (client) await client.end();
  }
}

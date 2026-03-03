
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
        p.oid as oid,
        p.proname as name,
        pg_catalog.pg_get_function_result(p.oid) as result_type,
        pg_catalog.pg_get_function_arguments(p.oid) as arguments,
        pg_catalog.obj_description(p.oid, 'pg_proc') as comment,
        n.nspname as schema,
        CASE 
          WHEN p.prokind = 'f' THEN 'FUNCTION'
          WHEN p.prokind = 'p' THEN 'PROCEDURE'
          WHEN p.prokind = 'a' THEN 'AGGREGATE'
          WHEN p.prokind = 'w' THEN 'WINDOW'
          ELSE 'ROUTINE'
        END as kind
      FROM pg_catalog.pg_proc p
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p') -- f = function, p = procedure
      ORDER BY 1;
    `;

    const result = await client.query(query);
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Database Procedures Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await closeDatabaseClient(client);
  }
}

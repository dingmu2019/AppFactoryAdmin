
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient, closeDatabaseClient } from '@/lib/db';
import { requireDatabaseAdmin } from '../../_auth';

export async function GET(req: NextRequest) {
  const auth = await requireDatabaseAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const oidParam = searchParams.get('oid');
  const oid = oidParam ? Number(oidParam) : null;
  const name = searchParams.get('name');

  if (!oid && !name) {
    return NextResponse.json({ error: 'Procedure oid or name is required' }, { status: 400 });
  }

  let client;
  try {
    client = await getDatabaseClient();

    const queryByOid = `
      SELECT pg_get_functiondef(p.oid) as definition
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.oid = $1;
    `;

    const queryByName = `
      SELECT pg_get_functiondef(p.oid) as definition
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = $1;
    `;

    const result = oid
      ? await client.query(queryByOid, [oid])
      : await client.query(queryByName, [name]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Procedure not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database Procedure Definition Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await closeDatabaseClient(client);
  }
}

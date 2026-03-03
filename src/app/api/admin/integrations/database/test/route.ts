
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(req: NextRequest) {
  try {
    // Auth is handled by middleware for /api/admin/* paths
    
    const body = await req.json();
    const { host, port, user, password, database, ssl } = body;

    if (!host || !port || !user || !database) {
      return NextResponse.json({ error: 'Missing required database configuration' }, { status: 400 });
    }

    const client = new Client({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000, // 5s timeout
    });

    try {
      await client.connect();
      const result = await client.query('SELECT version()');
      await client.end();

      return NextResponse.json({
        success: true,
        version: result.rows[0].version,
        message: 'Successfully connected to database'
      });
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: err.message,
        details: err.stack
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

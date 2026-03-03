import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateDatabaseExport, DbExportOptions } from '@/services/dbExport';
import pg from 'pg';
import { requireDatabaseAdmin } from '../_auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireDatabaseAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') as any || 'schema';
    const includeData = searchParams.get('includeData') === 'true';
    const includeRls = searchParams.get('includeRls') === 'true';
    const seedTables = searchParams.get('seedTables')?.split(',') || [];

    // Use JS-based export service instead of pg_dump
    // This works even if pg_dump is not installed on the server
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    try {
      const options: DbExportOptions = {
        mode,
        includeData,
        includeRls,
        seedTables: seedTables.length > 0 ? seedTables : undefined
      };

      const sql = await generateDatabaseExport(client, options);

      return new NextResponse(sql, {
        headers: {
          'Content-Type': 'application/sql',
          'Content-Disposition': `attachment; filename="database_export_${new Date().toISOString().split('T')[0]}.sql"`,
        },
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { PassThrough, Readable } from 'stream';
import { createGzip } from 'zlib';
import { getDatabaseDumpConfig } from '@/lib/db';
import { ensurePgDumpAvailable } from '@/lib/pgDump';
import { requireDatabaseAdmin } from '../_auth';
import { AuditLogService } from '@/services/auditService';
import pg from 'pg';
import { generateDatabaseExport } from '@/services/dbExport';

export const runtime = 'nodejs';

function formatTimestamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const compress = (url.searchParams.get('compress') ?? 'gzip') === 'gzip';
  const clean = url.searchParams.get('clean') === '1';
  let auth: any = null;

  try {
    const authResult = await requireDatabaseAdmin(req);
    if (authResult instanceof NextResponse) return authResult;
    auth = authResult;

    const cfg = await getDatabaseDumpConfig();

    let pgDumpCmd: string | null = null;
    try {
      pgDumpCmd = await ensurePgDumpAvailable();
    } catch (e) {
      console.warn('pg_dump not found, falling back to JS-based export');
    }

    if (!pgDumpCmd) {
      // Fallback JS-based logic
      const client = new pg.Client({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        ssl: cfg.ssl ? { rejectUnauthorized: false } : (process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined)
      });

      await client.connect();

      try {
        const sql = await generateDatabaseExport(client, { 
          mode: 'bootstrap', 
          includeData: true, 
          includeRls: true 
        });

        let body: any = sql;
        let contentType = 'application/sql; charset=utf-8';
        const ts = formatTimestamp();
        const base = `database_backup_${cfg.database || 'db'}_${ts}.sql`;
        let filename = base;

        if (compress) {
          const gzip = createGzip();
          const readable = new Readable();
          readable._read = () => {};
          readable.push(sql);
          readable.push(null);
          
          const chunks: any[] = [];
          const compressed = await new Promise<Buffer>((resolve, reject) => {
            readable.pipe(gzip)
              .on('data', (chunk) => chunks.push(chunk))
              .on('end', () => resolve(Buffer.concat(chunks)))
              .on('error', reject);
          });
          
          body = compressed;
          contentType = 'application/gzip';
          filename = `${base}.gz`;
        }

        await AuditLogService.log({
          user_id: auth.userId,
          action: 'DATABASE_BACKUP',
          resource: 'database',
          details: { compress, clean, method: 'js-fallback', bytes: Buffer.byteLength(body) },
          status: 'SUCCESS',
        });

        return new NextResponse(body, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store',
          },
        });
      } finally {
        await client.end();
      }
    }

    const args = [
      '--no-owner',
      '--no-privileges',
      '--format=plain',
      '--encoding=UTF8',
      '-h', cfg.host,
      '-p', String(cfg.port || 5432),
      '-U', cfg.user,
      '-d', cfg.database,
    ];
    if (clean) {
      args.unshift('--if-exists');
      args.unshift('--clean');
    }

    const env = {
      ...process.env,
      PGPASSWORD: cfg.password || '',
      PGSSLMODE: cfg.ssl ? 'require' : (process.env.PGSSLMODE || 'prefer'),
    };

    const proc = spawn(pgDumpCmd, args, { env });
    const out = new PassThrough();

    let bytes = 0;
    proc.stdout.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);
    });

    const stream = compress ? proc.stdout.pipe(createGzip()) : proc.stdout;
    stream.pipe(out);

    const stderrChunks: Buffer[] = [];
    proc.stderr.on('data', (c) => {
      if (stderrChunks.reduce((s, b) => s + b.length, 0) < 32 * 1024) stderrChunks.push(Buffer.from(c));
    });

    proc.on('close', async (code) => {
      if (code === 0) {
        await AuditLogService.log({
          user_id: auth.userId,
          action: 'DATABASE_BACKUP',
          resource: 'database',
          details: { compress, clean, bytes },
          status: 'SUCCESS',
        });
        out.end();
        return;
      }

      const errText = Buffer.concat(stderrChunks).toString('utf8');
      await AuditLogService.log({
        user_id: auth.userId,
        action: 'DATABASE_BACKUP',
        resource: 'database',
        details: { compress, clean, bytes, code, error: errText || 'pg_dump failed' },
        status: 'FAILURE',
      });
      out.destroy(new Error(errText || 'pg_dump failed'));
    });

    proc.on('error', async (err: any) => {
      const msg = err?.code === 'ENOENT' ? 'pg_dump not found on server' : (err?.message || 'pg_dump error');
      await AuditLogService.log({
        user_id: auth.userId,
        action: 'DATABASE_BACKUP',
        resource: 'database',
        details: { compress, clean, error: msg },
        status: 'FAILURE',
      });
      out.destroy(new Error(msg));
    });

    const ts = formatTimestamp();
    const base = `database_backup_${cfg.database || 'db'}_${ts}.sql`;
    const filename = compress ? `${base}.gz` : base;

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Type', compress ? 'application/gzip' : 'application/sql; charset=utf-8');
    headers.set('Cache-Control', 'no-store');

    return new NextResponse(Readable.toWeb(out) as any, { headers });
  } catch (error: any) {
    try {
      if (auth?.userId) {
        await AuditLogService.log({
          user_id: auth.userId,
          action: 'DATABASE_BACKUP',
          resource: 'database',
          details: { error: error?.message || 'Unexpected error' },
          status: 'FAILURE',
        });
      }
    } catch {}
    return NextResponse.json({ error: error?.message || 'Backup failed' }, { status: 500 });
  }
}

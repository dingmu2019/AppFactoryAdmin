import fs from 'fs';
import { spawn } from 'child_process';

let cachedOk: boolean | null = null;
let cachedCmd: string | null = null;

function getCmd() {
  const envPath = (process.env.PG_DUMP_PATH || '').trim();
  if (envPath) {
    if (!fs.existsSync(envPath)) throw new Error('PG_DUMP_PATH is set but file does not exist');
    return envPath;
  }
  return 'pg_dump';
}

export async function ensurePgDumpAvailable() {
  if (cachedOk) return cachedCmd || getCmd();
  if (cachedOk === false) throw new Error('pg_dump is not available');

  const cmd = getCmd();
  const proc = spawn(cmd, ['--version'], { stdio: 'ignore' });

  const result: { ok: boolean; error?: string } = await new Promise((resolve) => {
    proc.on('error', (err: any) => resolve({ ok: false, error: err?.code === 'ENOENT' ? 'pg_dump not found' : (err?.message || 'pg_dump error') }));
    proc.on('close', (code) => resolve({ ok: code === 0, error: code === 0 ? undefined : `pg_dump failed (${code})` }));
  });

  if (!result.ok) {
    cachedOk = false;
    throw new Error(result.error || 'pg_dump not available');
  }

  cachedOk = true;
  cachedCmd = cmd;
  return cmd;
}

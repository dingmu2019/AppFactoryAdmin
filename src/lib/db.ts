import { Client, Pool } from 'pg';
import { supabaseAdmin } from './supabase';
import dotenv from 'dotenv';
import { EncryptionService } from '@/services/EncryptionService';

dotenv.config();

// Global Pool Instance
let globalPool: Pool | null = null;

function maskConnectionString(url: string) {
  return url.replace(/:[^:@]*@/, ':****@');
}

function normalizeDatabaseUrl(rawUrl: string) {
  let urlStr = (rawUrl || '').trim();
  if ((urlStr.startsWith('"') && urlStr.endsWith('"')) || (urlStr.startsWith("'") && urlStr.endsWith("'"))) {
    urlStr = urlStr.slice(1, -1);
  }

  try {
    const u = new URL(urlStr);

    const isSupabasePooler = u.hostname.includes('pooler.supabase.com');
    const isSupabaseDirect = u.hostname.endsWith('.supabase.co');

    // Supabase direct DB uses 5432; pooler typically uses 6543 and must NOT be rewritten to 5432.
    if (isSupabaseDirect && u.port === '6543') {
      u.port = '5432';
    }

    if (!isSupabasePooler && u.searchParams.has('pgbouncer')) {
      u.searchParams.delete('pgbouncer');
      if ([...u.searchParams.keys()].length === 0) {
        u.search = '';
      }
    }

    return u.toString();
  } catch {
    return urlStr;
  }
}

function normalizeDatabasePort(host: string, port: any) {
  const p = Number(port);
  if (!host) return p || 5432;
  if (host.includes('pooler.supabase.com')) return p || 6543;
  if (host.endsWith('.supabase.co') && p === 6543) return 5432;
  return p || 5432;
}

function maybeDecryptSecret(value: any) {
  if (typeof value !== 'string') return value;
  if (!value) return value;
  if (value.includes(':')) return EncryptionService.decrypt(value);
  return value;
}

export interface DatabaseDumpConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl: boolean;
}

export async function getDatabaseDumpConfig(): Promise<DatabaseDumpConfig> {
  const directUrlRaw = (process.env.DIRECT_URL || '').trim();
  const databaseUrlRaw = (process.env.DATABASE_URL || '').trim();
  const postgresUrlRaw = (process.env.POSTGRES_URL || '').trim();

  let directUrl = directUrlRaw;
  if (!directUrl) {
    if (databaseUrlRaw.includes('pooler.supabase.com')) {
      throw new Error('Backup requires direct Postgres connection. DIRECT_URL is empty and DATABASE_URL points to Supabase pooler (pgbouncer). Please configure DIRECT_URL with a non-pooler connection string.');
    }
    if (databaseUrlRaw) {
      throw new Error('Backup requires direct Postgres connection. Please configure DIRECT_URL with a non-pooler connection string.');
    }
    directUrl = postgresUrlRaw;
  }

  if (directUrl) {
    directUrl = normalizeDatabaseUrl(directUrl);
    let u: URL | null = null;
    try {
      u = new URL(directUrl);
    } catch {
      u = null;
    }
    if (u) {
      const host = u.hostname;
      if (host.includes('pooler.supabase.com') && u.port === '6543') {
        throw new Error('Backup requires direct Postgres connection. The configured host is a Supabase pooler (pgbouncer) in transaction mode (port 6543). Please configure DIRECT_URL with session mode (port 5432) or a non-pooler connection string.');
      }
      return {
        host,
        port: normalizeDatabasePort(host, u.port),
        database: decodeURIComponent(u.pathname.replace(/^\//, '')),
        user: decodeURIComponent(u.username || ''),
        password: u.password ? decodeURIComponent(u.password) : undefined,
        ssl: true,
      };
    }
  }

  const envHost = process.env.DB_HOST || process.env.POSTGRES_HOST;
  if (envHost) {
    if (envHost.includes('pooler.supabase.com')) {
      throw new Error('Backup requires direct Postgres connection. DB_HOST/POSTGRES_HOST points to Supabase pooler (pgbouncer). Please configure a non-pooler host.');
    }
    return {
      host: envHost,
      port: normalizeDatabasePort(envHost, process.env.DB_PORT || process.env.POSTGRES_PORT),
      database: process.env.DB_NAME || (process.env.POSTGRES_DATABASE as string) || '',
      user: process.env.DB_USER || (process.env.POSTGRES_USER as string) || '',
      password: process.env.DB_PASSWORD || (process.env.POSTGRES_PASSWORD as string) || undefined,
      ssl: true,
    };
  }

  const { data: configRecord, error } = await supabaseAdmin
    .from('integration_configs')
    .select('config')
    .eq('category', 'database')
    .eq('is_enabled', true)
    .single();

  if (error || !configRecord) {
    throw new Error(error?.message || 'No database integration config found');
  }

  const dbConfig = configRecord.config as any;
  if (!dbConfig?.host || !dbConfig?.database || !dbConfig?.user) {
    throw new Error('Database configuration is incomplete');
  }
  if (String(dbConfig.host).includes('pooler.supabase.com')) {
    throw new Error('Backup requires direct Postgres connection. Integration config host points to Supabase pooler (pgbouncer). Please configure a non-pooler host.');
  }

  return {
    host: dbConfig.host,
    port: normalizeDatabasePort(dbConfig.host, dbConfig.port),
    database: dbConfig.database,
    user: dbConfig.user,
    password: maybeDecryptSecret(dbConfig.password),
    ssl: Boolean(dbConfig.ssl ?? true),
  };
}

export async function getDatabasePool() {
  if (globalPool) {
    return globalPool;
  }

  const timeoutMs = 20000; // Increased to 20s for cross-border latency (e.g. China -> AWS Mumbai)

  // 1. Try environment variables first (Standard for Vercel/Production)
  // Prefer DATABASE_URL (Pooler) for normal app operations, fallback to DIRECT_URL
  let connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.POSTGRES_URL;
  
  if (connectionUrl) {
      try {
        connectionUrl = normalizeDatabaseUrl(connectionUrl);

        console.log('Initializing Global Database Pool...');
        console.log('URL (masked):', maskConnectionString(connectionUrl));

        // 针对 Serverless 环境（Vercel, 腾讯 EdgeOne, SCF 等）进行连接池限制优化
        const isServerless = process.env.VERCEL || 
                           process.env.TENCENTCLOUD_REGION || 
                           process.env.SCF_FUNCTION_NAME || 
                           process.env.EDGEONE_PAGES;
        
        const maxConnections = process.env.DB_POOL_MAX ? 
                              parseInt(process.env.DB_POOL_MAX) : 
                              (isServerless ? 2 : 10);

        globalPool = new Pool({
          connectionString: connectionUrl,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: timeoutMs,
          max: maxConnections,
          idleTimeoutMillis: 30000,
        });
        
        return globalPool;
    } catch (err: any) {
      console.error('DATABASE_URL pool init failed:', err.message);
      globalPool = null; // Reset on failure
    }
  }

  // 2. Fallback to individual env vars
  const envHost = process.env.DB_HOST || process.env.POSTGRES_HOST;
  if (envHost) {
    try {
      console.log(`Initializing Global Database Pool via host vars: ${envHost}...`);
      globalPool = new Pool({
        host: envHost,
        port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432'),
        database: process.env.DB_NAME || process.env.POSTGRES_DATABASE,
        user: process.env.DB_USER || process.env.POSTGRES_USER,
        password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: timeoutMs,
        max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : (process.env.VERCEL ? 2 : 10),
        idleTimeoutMillis: 30000,
      });
      return globalPool;
    } catch (err: any) {
      console.error('Host vars pool init failed:', err.message);
      globalPool = null;
    }
  }

  // 3. Dynamic config from Supabase integration_configs
  try {
    console.log('Initializing Global Database Pool via Supabase integration_configs...');
    const { data: configRecord, error } = await supabaseAdmin
      .from('integration_configs')
      .select('config')
      .eq('category', 'database')
      .eq('is_enabled', true)
      .single();

    if (error || !configRecord) {
      throw new Error(error?.message || 'No config record');
    }

    const dbConfig = configRecord.config as any;
    if (!dbConfig?.host || !dbConfig?.database || !dbConfig?.user) {
      throw new Error('Database configuration in Supabase is incomplete.');
    }

    const normalizedPort = normalizeDatabasePort(dbConfig.host, dbConfig.port);
    const password = maybeDecryptSecret(dbConfig.password);

    globalPool = new Pool({
      host: dbConfig.host,
      port: normalizedPort || 5432,
      database: dbConfig.database,
      user: dbConfig.user,
      password,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
      connectionTimeoutMillis: timeoutMs,
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : (process.env.VERCEL ? 2 : 10),
      idleTimeoutMillis: 30000,
    });

    return globalPool;
  } catch (err: any) {
    console.error('Dynamic config pool init failed:', err.message);
    globalPool = null;
    throw new Error('Could not initialize database pool. Check DATABASE_URL or Supabase database integration config.');
  }
}

/**
 * Get a client from the pool (Recommended for Serverless)
 * Automatically handles connection reuse.
 * IMPORTANT: You must call client.release() when done, NOT client.end()
 */
export async function getDatabaseClient() {
  try {
    const pool = await getDatabasePool();
    const client = await pool.connect();
    return client;
  } catch (err: any) {
    console.warn('Failed to get client from pool, falling back to direct Client creation (legacy mode). Error:', err.message);
    // Fallback logic from original implementation (simplified)
    return getLegacyClient();
  }
}

export async function closeDatabaseClient(client: any) {
  if (!client) return;
  if (typeof client.release === 'function') {
    client.release();
    return;
  }
  if (typeof client.end === 'function') {
    await client.end();
  }
}

async function getLegacyClient() {
  const timeoutMs = 20000; // Increased to 20s for cross-border latency 
  let connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.POSTGRES_URL;
  if (connectionUrl) {
    connectionUrl = normalizeDatabaseUrl(connectionUrl);
  }

  if (connectionUrl) {
      const client = new Client({ connectionString: connectionUrl, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: timeoutMs });
      await client.connect();
      return client;
  }

  const envHost = process.env.DB_HOST || process.env.POSTGRES_HOST;
  if (envHost) {
    const client = new Client({
      host: envHost,
      port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432'),
      database: process.env.DB_NAME || process.env.POSTGRES_DATABASE,
      user: process.env.DB_USER || process.env.POSTGRES_USER,
      password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: timeoutMs,
    });
    await client.connect();
    return client;
  }

  const { data: configRecord, error } = await supabaseAdmin
    .from('integration_configs')
    .select('config')
    .eq('category', 'database')
    .eq('is_enabled', true)
    .single();

  if (error || !configRecord) {
    throw new Error(`Legacy client connection failed. (Supabase: ${error?.message || 'none'})`);
  }

  const dbConfig = configRecord.config as any;
  const normalizedPort = normalizeDatabasePort(dbConfig.host, dbConfig.port);
  const password = maybeDecryptSecret(dbConfig.password);
  const client = new Client({
    host: dbConfig.host,
    port: normalizedPort || 5432,
    database: dbConfig.database,
    user: dbConfig.user,
    password,
    ssl: dbConfig.ssl ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
    connectionTimeoutMillis: timeoutMs,
  });
  await client.connect();
  return client;
}

export interface TableInfo {
  name: string;
  comment: string | null;
}

export interface ColumnInfo {
  name: string;
  type: string;
  length: number | null;
  nullable: boolean;
  is_pk: boolean;
  comment: string | null;
}

export interface IndexInfo {
  name: string;
  is_unique: boolean;
  definition: string;
}

export interface ForeignKeyInfo {
  name: string;
  column: string;
  ref_table: string;
  ref_column: string;
}

export interface SchemaInfo {
  table: TableInfo;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
}

import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for fetching config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function getDatabaseClient() {
  // 1. Fetch active database config
  const { data: configRecord, error } = await supabase
    .from('integration_configs')
    .select('config')
    .eq('category', 'database')
    .eq('is_enabled', true)
    .single();

  if (error || !configRecord) {
    throw new Error('No active database configuration found.');
  }

  const dbConfig = configRecord.config;

  if (dbConfig.type !== 'postgres' && dbConfig.type !== 'supabase') {
     throw new Error(`Unsupported database type: ${dbConfig.type}. Only PostgreSQL is supported currently.`);
  }

  // 2. Create PG Client
  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    ssl: dbConfig.ssl ? { rejectUnauthorized: false } : undefined,
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

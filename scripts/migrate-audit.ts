import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { Client } = pg;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function migrate() {
  console.log('🔍 Fetching database credentials...');
  
  // 1. Fetch config
  const { data: configRecord, error } = await supabase
    .from('integration_configs')
    .select('config')
    .eq('category', 'database')
    .eq('is_enabled', true)
    .single();

  if (error || !configRecord) {
    console.error('❌ Failed to fetch database config:', error || 'No active config');
    // Fallback to DATABASE_URL if available
    if (process.env.DATABASE_URL) {
        console.log('⚠️ Using DATABASE_URL from env as fallback...');
        await runMigration(process.env.DATABASE_URL);
        return;
    }
    process.exit(1);
  }

  const dbConfig = configRecord.config;
  console.log(`✅ Found config for: ${dbConfig.host}`);

  // Construct connection string or config object
  const clientConfig = {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    ssl: dbConfig.ssl ? { rejectUnauthorized: false } : undefined,
  };

  await runMigration(clientConfig);
}

async function runMigration(config: any) {
  const client = new Client(config);
  
  try {
    console.log('🐘 Connecting to database...');
    await client.connect();
    
    const sqlPath = path.resolve(__dirname, '../backend/sql/fix_audit_logs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🛠 Executing migration...');
    await client.query(sql);
    
    console.log('✅ Migration successful!');
  } catch (e) {
    console.error('❌ Migration failed:', e);
  } finally {
    await client.end();
  }
}

migrate();

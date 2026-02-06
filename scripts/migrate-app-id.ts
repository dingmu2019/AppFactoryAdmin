import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { Client } = pg;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const MAPPINGS = {
  'AdminSys_app': 'AdminSys_app', // Name -> New ID
  'lottery_app': 'lottery_app',
  'OmniDebate_app': 'OmniDebate_app'
};

async function migrate() {
  // 1. Fetch DB Config
  const { data: configRecord } = await supabase
    .from('integration_configs')
    .select('config')
    .eq('category', 'database')
    .eq('is_enabled', true)
    .single();

  const dbConfig = configRecord?.config;
  if (!dbConfig) {
      console.error('❌ No DB config found');
      process.exit(1);
  }

  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    ssl: dbConfig.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    
    // 2. Run Alter Script
    console.log('🛠 Altering schema to support string IDs...');
    const sqlPath = path.resolve(__dirname, '../backend/sql/alter_app_id_type.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('✅ Schema altered.');

    // 3. Update existing app IDs
    console.log('🔄 Updating existing app IDs...');
    
    // Get current apps
    const { rows: apps } = await client.query('SELECT id, name FROM saas_apps');
    
    for (const app of apps) {
        const newId = MAPPINGS[app.name];
        if (newId && app.id !== newId) {
            console.log(`   Updating ${app.name}: ${app.id} -> ${newId}`);
            // Because we added ON UPDATE CASCADE, this single update should propagate to all related tables!
            await client.query('UPDATE saas_apps SET id = $1 WHERE id = $2', [newId, app.id]);
        }
    }
    
    console.log('✅ IDs updated successfully.');

  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    await client.end();
  }
}

migrate();

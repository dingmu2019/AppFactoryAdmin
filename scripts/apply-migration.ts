
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: 'backend/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  const sql = `ALTER TABLE integration_configs DROP CONSTRAINT IF EXISTS integration_configs_category_key;`;
  
  console.log('Executing SQL:', sql);
  
  // Supabase JS client doesn't support raw SQL execution directly on public schema easily without RPC.
  // However, we can use the 'postgres' connection if we had pg client, but here we only have supabase-js.
  // Actually, we can use RPC if we have a function, but we don't.
  // But wait, the project uses 'pg' package in package.json.
  
  // Let's try to use 'pg' directly if connection string is available.
  // Usually DATABASE_URL is in .env
  
  const { Client } = await import('pg');
  
  // Use DATABASE_URL first to see if it works
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
      console.error('DATABASE_URL not found in .env');
      // Fallback: Try to update via supabase-js if possible? No, can't alter table.
      process.exit(1);
  }
  
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await client.end();
  }
}

applyMigration();

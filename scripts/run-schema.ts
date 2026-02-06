import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const executeSchema = async () => {
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is missing in .env.local');
    console.error('To execute SQL scripts, we need the direct PostgreSQL connection string.');
    console.error('Please add it to your .env.local file:');
    console.error('DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"');
    console.error('\nYou can find this in Supabase Dashboard -> Project Settings -> Database -> Connection string');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();

    console.log('📖 Reading schema.sql...');
    const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Executing schema script...');
    // Split by semicolons might be risky for complex functions/triggers, 
    // but typically pg driver can handle multiple statements if passed as one string.
    // However, for safety with transactions and large files, running as one block is usually fine in pg.
    await client.query(schemaSql);

    console.log('✅ Schema executed successfully!');
  } catch (err) {
    console.error('❌ Failed to execute schema:', err);
  } finally {
    await client.end();
  }
};

executeSchema();

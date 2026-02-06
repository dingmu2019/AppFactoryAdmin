import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const executeMigration = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is missing in .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();

    console.log('📖 Reading seed script (09_seed_llm_config.sql)...');
    const schemaPath = path.resolve(__dirname, '../supabase/migrations/09_seed_llm_config.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Seeding LLM Config...');
    await client.query(schemaSql);

    console.log('✅ LLM Config seeded successfully!');
  } catch (err) {
    console.error('❌ Failed to seed config:', err);
  } finally {
    await client.end();
  }
};

executeMigration();

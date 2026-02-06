import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabaseClient } from '../src/lib/db/connection.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('Starting Soft Delete Migration...');
  let client;
  try {
    client = await getDatabaseClient();
    console.log('Connected to DB.');

    const sqlPath = path.join(__dirname, '../sql/enable_soft_delete_agents.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL...');
    await client.query(sql);
    console.log('Migration completed successfully.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    if (client) {
        await client.end();
        console.log('Disconnected.');
    }
  }
}

runMigration();

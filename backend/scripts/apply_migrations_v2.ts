
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env BEFORE importing connection
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getDatabaseClient } from '../src/lib/db/connection.ts';

async function runMigrations() {
    let client;
    try {
        console.log('Connecting to database via Integration Config...');
        client = await getDatabaseClient();
        console.log('Connected.');

        const migrationsDir = path.join(__dirname, '../../supabase/migrations');
        const file = '59_ai_gateway_alert_rules.sql';
        const filePath = path.join(migrationsDir, file);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Migration file ${file} not found`);
        }

        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`Applying ${file}...`);

        try {
            await client.query(sql);
            console.log(`✅ ${file} applied successfully.`);
        } catch (err: any) {
            if (err.code === '42P07') {
                console.log(`⚠️  ${file}: Table already exists, skipping.`);
            } else {
                throw err;
            }
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        if (client) await client.end();
    }
}

runMigrations();

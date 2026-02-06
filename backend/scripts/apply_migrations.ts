
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('Connected to database...');

        const migrationsDir = path.join(__dirname, '../../supabase/migrations');
        const files = fs.readdirSync(migrationsDir).sort();

        // Specific files we want to apply for this task
        const targetFiles = [
            '42_coupon_system.sql',
            '44_add_coupon_apis.sql',
            '45_rate_limit_defaults.sql',
            '46_subscription_system.sql',
            '47_add_subscription_apis.sql',
            '48_system_error_logs.sql',
            '49_add_alert_apis.sql',
            '50_add_coupon_mgmt_apis.sql',
            '52_message_templates.sql'
        ];

        for (const file of files) {
            if (!targetFiles.includes(file)) continue;

            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Applying ${file}...`);
            
            // Basic error handling for "relation already exists"
            try {
                await client.query(sql);
                console.log(`✅ ${file} applied successfully.`);
            } catch (err: any) {
                if (err.code === '42P07') { // duplicate_table
                    console.log(`⚠️  ${file}: Table already exists, skipping.`);
                } else if (err.code === '42701') { // duplicate_column
                    console.log(`⚠️  ${file}: Column already exists, skipping.`);
                } else {
                    console.error(`❌ ${file} failed: ${err.message}`);
                    // Continue to next file? Or stop? 
                    // For verification, we try to proceed.
                }
            }
        }

        console.log('Migration process completed.');

    } catch (err) {
        console.error('Migration script error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();

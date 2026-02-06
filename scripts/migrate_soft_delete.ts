
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: 'backend/.env' });

async function migrate() {
  // Try to use the DIRECT_URL again but with SSL disabled, as Pooler might be finicky with migrations
  const connectionString = process.env.DIRECT_URL;
  
  if (!connectionString) {
      console.error('DIRECT_URL not found');
      process.exit(1);
  }

  const client = new Client({ 
      connectionString,
      ssl: {
          rejectUnauthorized: false
      }
  });
  await client.connect();

  try {
    console.log('Starting migration...');

    // 1. Add is_deleted column
    await client.query(`
      ALTER TABLE integration_configs 
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    `);
    console.log('Added is_deleted column.');

    // 2. Drop unique constraint on category (if exists)
    // We try to drop the constraint by name. The default name usually follows a pattern or we force drop index.
    await client.query(`
      ALTER TABLE integration_configs 
      DROP CONSTRAINT IF EXISTS integration_configs_category_key;
    `);
    // Also check for unique index
    await client.query(`
      DROP INDEX IF EXISTS integration_configs_category_key;
    `);
    console.log('Dropped category unique constraint.');

    // 3. Data Migration: Split LLM models
    const { rows } = await client.query(`
        SELECT * FROM integration_configs 
        WHERE category = 'llm' AND is_deleted = FALSE
    `);

    for (const row of rows) {
        if (row.config && row.config.models && Array.isArray(row.config.models)) {
            console.log(`Migrating row ${row.id} with ${row.config.models.length} models...`);
            
            for (const model of row.config.models) {
                // Insert new row for this model
                await client.query(`
                    INSERT INTO integration_configs (category, config, is_enabled, created_at, updated_at, is_deleted)
                    VALUES ($1, $2, $3, NOW(), NOW(), FALSE)
                `, ['llm', model, model.enabled !== false]);
            }

            // Soft delete the original container row
            await client.query(`
                UPDATE integration_configs 
                SET is_deleted = TRUE 
                WHERE id = $1
            `, [row.id]);
            
            console.log(`Migrated and soft-deleted container row ${row.id}`);
        }
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();

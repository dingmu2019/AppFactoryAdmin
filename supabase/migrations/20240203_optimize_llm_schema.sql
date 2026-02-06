-- 1. Add is_deleted column
ALTER TABLE integration_configs 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 2. Drop unique constraint on category
-- We attempt to drop both constraint and index to be sure
ALTER TABLE integration_configs 
DROP CONSTRAINT IF EXISTS integration_configs_category_key;

DROP INDEX IF EXISTS integration_configs_category_key;

-- 3. Data Migration: Split 'models' array into individual rows
-- This extracts each model from the 'models' array in existing 'llm' records
-- and inserts them as new, individual rows in integration_configs.

INSERT INTO integration_configs (category, config, is_enabled, created_at, updated_at, is_deleted)
SELECT 
    'llm', 
    model_elem, 
    COALESCE((model_elem->>'enabled')::boolean, true), -- Default to true if missing
    NOW(), 
    NOW(), 
    FALSE
FROM 
    integration_configs,
    jsonb_array_elements(config->'models') AS model_elem
WHERE 
    category = 'llm' 
    AND config ? 'models' 
    AND jsonb_typeof(config->'models') = 'array'
    AND (is_deleted IS NULL OR is_deleted = FALSE);

-- 4. Soft delete the old container rows (the ones that had the 'models' array)
UPDATE integration_configs
SET is_deleted = TRUE
WHERE 
    category = 'llm' 
    AND config ? 'models' 
    AND jsonb_typeof(config->'models') = 'array';

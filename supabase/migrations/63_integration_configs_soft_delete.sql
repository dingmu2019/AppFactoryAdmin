-- Add is_deleted column to integration_configs if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integration_configs' AND column_name = 'is_deleted') THEN 
        ALTER TABLE integration_configs ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE; 
    END IF; 
END $$;

-- Drop existing unique constraint if exists (to replace with partial index)
ALTER TABLE integration_configs DROP CONSTRAINT IF EXISTS integration_configs_category_key;

-- Create partial unique index to allow soft deletes with same category
DROP INDEX IF EXISTS idx_integration_configs_category_active;
CREATE UNIQUE INDEX idx_integration_configs_category_active 
ON integration_configs (category) 
WHERE is_deleted = false OR is_deleted IS NULL;

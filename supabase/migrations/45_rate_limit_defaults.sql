
-- Add Quota Management Fields to saas_apps

-- Note: We store rate_limit in JSONB 'config' usually, but having explicit columns helps with quick analytics/enforcement
-- However, since our RateLimiter reads from 'config.rate_limit', we should ensure we have a migration that sets defaults.

-- Update config with default rate limits for existing apps
UPDATE saas_apps
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{rate_limit}',
    '"60"'::jsonb
)
WHERE config->>'rate_limit' IS NULL;

-- Create a Quota Usage table for daily/monthly tracking (optional future expansion)
-- For now, Redis handles the window counters.
-- We can add a view or function to help admins update this.


-- Webhook System Schema

-- 1. Webhooks Table (Subscriptions)
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id VARCHAR(255) NOT NULL REFERENCES saas_apps(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(255) NOT NULL, -- Signing secret (hmac key)
    events TEXT[] NOT NULL, -- Array of event types (e.g. ['ORDER.PAID', 'MESSAGE.FAILED'])
    is_active BOOLEAN DEFAULT TRUE,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by app and event
CREATE INDEX idx_webhooks_app_id ON webhooks(app_id);

-- 2. Webhook Events Table (Delivery Logs)
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id VARCHAR(255) NOT NULL REFERENCES saas_apps(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sending, success, failed
    response_status INTEGER, -- HTTP Status Code
    response_body TEXT,
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_attempt_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE webhooks IS 'External App Webhook Subscriptions';
COMMENT ON TABLE webhook_events IS 'Webhook Delivery Logs and Queue';

-- RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Policies
-- Apps can manage their own webhooks
CREATE POLICY "Apps can manage own webhooks" ON webhooks
    USING (auth.uid() IN (SELECT owner_id FROM saas_apps WHERE id = webhooks.app_id))
    WITH CHECK (auth.uid() IN (SELECT owner_id FROM saas_apps WHERE id = webhooks.app_id));

-- Apps can view their own events
CREATE POLICY "Apps can view own webhook events" ON webhook_events
    FOR SELECT
    USING (auth.uid() IN (SELECT owner_id FROM saas_apps WHERE id = webhook_events.app_id));

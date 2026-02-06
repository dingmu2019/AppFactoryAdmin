-- Metering System

-- 1. Billing Meters (Definition of what we charge for)
CREATE TABLE billing_meters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_key VARCHAR(100) NOT NULL UNIQUE, -- e.g. 'ai_token', 'api_call', 'storage_gb'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_per_unit DECIMAL(18, 8) DEFAULT 0, -- Supports micro-transactions
    currency VARCHAR(3) DEFAULT 'CNY',
    unit_name VARCHAR(50) DEFAULT 'unit',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Metering Events (Raw usage logs)
-- High volume table, partitioned by time in production
CREATE TABLE metering_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id VARCHAR(255) NOT NULL REFERENCES saas_apps(id) ON DELETE CASCADE,
    metric_key VARCHAR(100) NOT NULL REFERENCES billing_meters(metric_key),
    amount DECIMAL(18, 8) NOT NULL,
    dimensions JSONB DEFAULT '{}'::jsonb, -- e.g. { "model": "gpt-4", "path": "/v1/chat" }
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE -- Null if not yet aggregated/billed
);

-- Index for aggregation
CREATE INDEX idx_metering_app_metric_time ON metering_events(app_id, metric_key, recorded_at);

-- Seed Meters
INSERT INTO billing_meters (metric_key, name, price_per_unit, unit_name) VALUES
('ai_token_input', 'AI Input Token', 0.00001, 'token'),
('ai_token_output', 'AI Output Token', 0.00003, 'token'),
('api_call', 'API Request', 0.01, 'request'),
('storage_gb_day', 'Storage', 0.5, 'GB/Day')
ON CONFLICT (metric_key) DO NOTHING;

-- RLS
ALTER TABLE billing_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE metering_events ENABLE ROW LEVEL SECURITY;

-- Only system admins can manage meters
CREATE POLICY "Admins manage meters" ON billing_meters
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

-- Apps can view their own usage (read-only)
CREATE POLICY "Apps view own usage" ON metering_events
    FOR SELECT
    USING (auth.uid() IN (SELECT owner_id FROM saas_apps WHERE id = metering_events.app_id));

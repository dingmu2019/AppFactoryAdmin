
-- Subscription System Schema

-- 1. Subscriptions Table (Active/Historical Subscriptions)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id VARCHAR(255) NOT NULL REFERENCES saas_apps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- External Provider Info
    provider VARCHAR(50) NOT NULL, -- stripe, wechat, manual
    external_subscription_id VARCHAR(100), -- stripe sub_xxx
    external_customer_id VARCHAR(100), -- stripe cus_xxx
    
    -- Plan Details
    plan_key VARCHAR(50) NOT NULL, -- e.g. pro_monthly
    status VARCHAR(50) NOT NULL, -- active, past_due, canceled, incomplete
    
    -- Period
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(app_id, external_subscription_id)
);

-- 2. Add Subscription fields to user_app_relations for quick access
ALTER TABLE user_app_relations 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;

-- Index
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id, app_id);
CREATE INDEX idx_subscriptions_external_id ON subscriptions(external_subscription_id);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service Role (backend) has full access (implicit)

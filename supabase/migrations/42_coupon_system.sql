
-- Coupon System Schema

-- 1. Coupons Table (Rule Definition)
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id VARCHAR(255) NOT NULL REFERENCES saas_apps(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- Promo Code (e.g. SUMMER2024)
    type VARCHAR(20) NOT NULL CHECK (type IN ('percent', 'fixed')), -- 'percent' or 'fixed'
    value DECIMAL(10,2) NOT NULL, -- 10 (for 10% or $10)
    min_purchase DECIMAL(10,2) DEFAULT 0, -- Minimum order amount
    max_discount DECIMAL(10,2), -- Cap for percent discount
    start_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_at TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER, -- Global limit
    usage_count INTEGER DEFAULT 0, -- Current usage
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id, code)
);

-- 2. User Coupons Table (Claimed/Distributed Coupons - Optional but good for targeted)
-- For now, we support public codes. This table tracks usage history per user.
CREATE TABLE coupon_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    discount_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_coupons_code ON coupons(app_id, code);
CREATE INDEX idx_coupon_usages_user ON coupon_usages(user_id);

-- Add comments
COMMENT ON TABLE coupons IS 'Marketing Coupons and Promo Codes';
COMMENT ON TABLE coupon_usages IS 'History of coupon redemption';

-- RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

-- Policies
-- Apps can manage their own coupons
CREATE POLICY "Apps can manage own coupons" ON coupons
    USING (auth.uid() IN (SELECT owner_id FROM saas_apps WHERE id = coupons.app_id))
    WITH CHECK (auth.uid() IN (SELECT owner_id FROM saas_apps WHERE id = coupons.app_id));

-- Public read for active coupons (for verification) - strictly speaking, verification should be RPC or Service role
-- But allow authenticated users to read coupons if they know the code (filtered by app)
CREATE POLICY "Users can read coupons" ON coupons
    FOR SELECT
    USING (true); -- Verification logic will handle validation

-- Users can view their own usage
CREATE POLICY "Users can view own usage" ON coupon_usages
    FOR SELECT
    USING (auth.uid() = user_id);

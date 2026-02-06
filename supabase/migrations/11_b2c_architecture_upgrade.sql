-- 11_b2c_architecture_upgrade.sql
-- 核心思路：单体架构 + 应用维度隔离 + 全局用户池

-- ==============================================================================
-- 1. 全局用户与应用扩展 (Global User & App Extension)
-- ==============================================================================

-- 1.1 改造 public.users 表为全局用户表
-- 移除 source_app_id 的强绑定约束（改为仅记录注册来源，非归属）
COMMENT ON COLUMN public.users.source_app_id IS '注册来源应用ID (仅用于统计，不限制登录)';

-- 1.2 用户-应用扩展表 (User App Extension)
-- 存储用户在特定应用下的个性化数据（会员等级、积分、收货地址等）
CREATE TABLE IF NOT EXISTS public.user_app_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES public.saas_apps(id) ON DELETE CASCADE,
    
    -- 应用专属业务字段
    vip_level VARCHAR(50) DEFAULT 'v0', -- 会员等级
    points INTEGER DEFAULT 0,           -- 积分余额
    tags TEXT[],                        -- 用户标签
    custom_data JSONB DEFAULT '{}',     -- 扩展数据 (如收货地址、偏好设置)
    
    last_active_at TIMESTAMPTZ,         -- 最后活跃时间
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 联合唯一索引：确保一个用户在一个应用下只有一条记录
    UNIQUE(user_id, app_id)
);

-- RLS: 用户只能看自己在当前应用的数据
ALTER TABLE public.user_app_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own app relations" ON public.user_app_relations
    FOR SELECT USING (auth.uid() = user_id);

-- ==============================================================================
-- 2. 商品管理：全局库 + 应用关联 (Global Products & App Relation)
-- ==============================================================================

-- 2.1 改造 products 表为全局商品基础库
-- 移除原有的 app_id 强绑定 (允许 app_id 为空，表示全局共享商品)
ALTER TABLE public.products ALTER COLUMN app_id DROP NOT NULL;
COMMENT ON COLUMN public.products.app_id IS '归属应用ID (若为空则为全局共享商品)';

-- 增加基础属性
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS base_cost DECIMAL(10,2); -- 成本价
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[];           -- 图片集
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specs JSONB;             -- 规格参数

-- 2.2 商品-应用关联表 (Goods App Relation)
-- 定义商品在特定应用中的上架状态、售价和个性化配置
CREATE TABLE IF NOT EXISTS public.product_app_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES public.saas_apps(id) ON DELETE CASCADE,
    
    -- 应用专属配置
    is_on_sale BOOLEAN DEFAULT false,    -- 是否上架
    sell_price DECIMAL(10,2),            -- 应用专属售价 (覆盖基础价格)
    sort_order INTEGER DEFAULT 0,        -- 应用内排序
    app_tags TEXT[],                     -- 应用专属标签 (如"热销", "新品")
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(product_id, app_id)
);

-- RLS
ALTER TABLE public.product_app_relations ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. 统一订单表 (Unified Orders)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(64) NOT NULL,       -- 订单号 (建议带应用前缀)
    
    -- 核心关联
    app_id UUID NOT NULL REFERENCES public.saas_apps(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    
    -- 金额信息
    total_amount DECIMAL(10,2) NOT NULL, -- 订单总额
    pay_amount DECIMAL(10,2) NOT NULL,   -- 实付金额
    discount_amount DECIMAL(10,2) DEFAULT 0, -- 优惠金额
    
    -- 状态流转
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, paid, shipped, completed, cancelled, refunded
    pay_status VARCHAR(32) DEFAULT 'unpaid',       -- unpaid, paying, success, fail
    
    -- 业务快照
    items_snapshot JSONB NOT NULL,       -- 商品快照 (防止商品改名/改价后订单失效)
    shipping_info JSONB,                 -- 收货信息
    
    pay_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_orders_app_user ON public.orders(app_id, user_id);
CREATE INDEX idx_orders_order_no ON public.orders(order_no);
CREATE INDEX idx_orders_status ON public.orders(status);

-- RLS: 用户只能看自己的订单
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. 应用配置与支付配置 (App Config & Payment)
-- ==============================================================================

-- 4.1 扩展 saas_apps 表，增加配置字段
ALTER TABLE public.saas_apps ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
COMMENT ON COLUMN public.saas_apps.config IS '应用全局配置 (UI、营销规则、订单超时等)';

-- 4.2 应用支付配置表 (App Pay Config)
CREATE TABLE IF NOT EXISTS public.app_pay_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES public.saas_apps(id) ON DELETE CASCADE,
    
    channel VARCHAR(32) NOT NULL, -- wechat, alipay, unionpay
    
    -- 敏感配置 (建议加密存储，此处仅演示)
    merchant_id VARCHAR(128),     -- 商户号
    merchant_key TEXT,            -- 密钥/证书
    notify_url VARCHAR(255),      -- 回调地址
    
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(app_id, channel)
);

-- RLS: 仅管理员可读
ALTER TABLE public.app_pay_configs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. 触发器：自动更新 updated_at
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_app_modtime BEFORE UPDATE ON public.user_app_relations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_product_app_modtime BEFORE UPDATE ON public.product_app_relations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

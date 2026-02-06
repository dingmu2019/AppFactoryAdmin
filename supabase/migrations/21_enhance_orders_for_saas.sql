-- 21_enhance_orders_for_saas.sql
-- 针对 SaaS 软件工厂模式，增强订单表字段，满足订阅、支付对账和自动化开通需求

-- 1. 增加支付详情字段 (Payment Details)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'CNY',             -- 货币类型 (CNY, USD)
ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(32),                -- 支付渠道 (stripe, alipay, wechat)
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(128),                -- 第三方支付流水号 (用于对账)
ADD COLUMN IF NOT EXISTS client_ip VARCHAR(45);                      -- 下单IP (风控用)

-- 2. 增加 SaaS 业务字段 (SaaS Specifics)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_type VARCHAR(32) DEFAULT 'subscription', -- 订单类型: subscription(订阅), one_time(买断/充值), renewal(续费)
ADD COLUMN IF NOT EXISTS plan_key VARCHAR(64),                          -- 套餐标识 (如: pro_monthly, enterprise_yearly)
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20),                     -- 计费周期 (month, year, lifetime)
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(128);                  -- 外部订阅ID (关联 Stripe Subscription ID)

-- 3. 增加开通状态 (Provisioning)
-- 支付成功不代表服务已开通（可能需要异步部署资源）
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS provision_status VARCHAR(32) DEFAULT 'pending'; -- pending, processing, completed, failed

COMMENT ON COLUMN public.orders.provision_status IS 'SaaS服务开通状态 (支付成功后触发自动化部署)';

-- 4. 索引优化
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON public.orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_subscription_id ON public.orders(subscription_id);

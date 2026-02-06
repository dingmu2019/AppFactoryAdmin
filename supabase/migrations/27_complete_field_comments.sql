-- 27_complete_field_comments.sql
-- 补全关键业务表的字段注释
-- 覆盖表: ai_chat_messages, audit_logs, debate_messages, error_logs, integration_configs, orders, product_app_relations, product_categories, products

-- ==============================================================================
-- 1. ai_chat_messages (AI 对话消息)
-- ==============================================================================
COMMENT ON COLUMN public.ai_chat_messages.id IS '消息主键ID';
COMMENT ON COLUMN public.ai_chat_messages.user_id IS '关联用户ID';
COMMENT ON COLUMN public.ai_chat_messages.agent_id IS '关联智能体ID';
COMMENT ON COLUMN public.ai_chat_messages.role IS '消息角色: user(用户) 或 assistant(AI)';
COMMENT ON COLUMN public.ai_chat_messages.content IS '对话消息内容';
COMMENT ON COLUMN public.ai_chat_messages.created_at IS '消息创建时间';

-- ==============================================================================
-- 2. audit_logs (审计日志)
-- ==============================================================================
COMMENT ON COLUMN public.audit_logs.id IS '日志记录唯一标识ID';
COMMENT ON COLUMN public.audit_logs.created_at IS '操作发生时间';

-- ==============================================================================
-- 3. debate_messages (辩论消息)
-- ==============================================================================
COMMENT ON COLUMN public.debate_messages.id IS '消息唯一标识ID';
COMMENT ON COLUMN public.debate_messages.created_at IS '发言时间';

-- ==============================================================================
-- 4. error_logs (系统错误日志)
-- ==============================================================================
COMMENT ON COLUMN public.error_logs.id IS '日志记录唯一标识ID';
COMMENT ON COLUMN public.error_logs.created_at IS '错误发生时间';
-- 备注: 用户提到的 system_error_logs 通常指此表，若存在同名表可在此补充

-- ==============================================================================
-- 5. integration_configs (集成配置)
-- ==============================================================================
COMMENT ON COLUMN public.integration_configs.id IS '配置记录ID';
COMMENT ON COLUMN public.integration_configs.created_at IS '配置创建时间';
COMMENT ON COLUMN public.integration_configs.updated_at IS '配置最后更新时间';

-- ==============================================================================
-- 6. orders (订单表 - 核心)
-- ==============================================================================
-- 基础字段
COMMENT ON COLUMN public.orders.id IS '订单唯一标识ID (UUID)';
COMMENT ON COLUMN public.orders.order_no IS '订单编号 (业务可视唯一标识)';
COMMENT ON COLUMN public.orders.app_id IS '所属SaaS应用ID';
COMMENT ON COLUMN public.orders.user_id IS '下单用户ID';
COMMENT ON COLUMN public.orders.total_amount IS '订单总金额 (商品原价总和)';
COMMENT ON COLUMN public.orders.pay_amount IS '实际支付金额 (扣除优惠后)';
COMMENT ON COLUMN public.orders.discount_amount IS '优惠金额';
COMMENT ON COLUMN public.orders.status IS '订单状态: pending(待处理), paid(已支付), shipped(已发货), completed(已完成), cancelled(已取消), refunded(已退款)';
COMMENT ON COLUMN public.orders.pay_status IS '支付状态: unpaid(未支付), paying(支付中), success(支付成功), fail(支付失败)';
COMMENT ON COLUMN public.orders.items_snapshot IS '商品快照 (JSONB): 记录下单时的商品名称、价格、规格等信息，防止商品变更影响历史订单';
COMMENT ON COLUMN public.orders.shipping_info IS '收货信息 (JSONB): 地址、联系人、电话等';
COMMENT ON COLUMN public.orders.pay_time IS '支付完成时间';
COMMENT ON COLUMN public.orders.created_at IS '下单时间';
COMMENT ON COLUMN public.orders.updated_at IS '最后更新时间';

-- SaaS/支付增强字段
COMMENT ON COLUMN public.orders.currency IS '货币类型 (如 CNY, USD)';
COMMENT ON COLUMN public.orders.payment_channel IS '支付渠道 (如 wechat, alipay, stripe)';
COMMENT ON COLUMN public.orders.transaction_id IS '第三方支付平台流水号 (用于对账)';
COMMENT ON COLUMN public.orders.client_ip IS '下单客户端IP地址';
COMMENT ON COLUMN public.orders.order_type IS '订单类型: subscription(订阅), one_time(一次性购买), renewal(续费)';
COMMENT ON COLUMN public.orders.plan_key IS '订阅套餐标识 (如 pro_monthly)';
COMMENT ON COLUMN public.orders.billing_cycle IS '计费周期 (如 month, year)';
COMMENT ON COLUMN public.orders.subscription_id IS '外部订阅ID (关联 Stripe/Paypal Subscription)';
COMMENT ON COLUMN public.orders.provision_status IS '资源开通状态: pending, processing, completed, failed';

-- ==============================================================================
-- 7. product_app_relations (商品-应用关联)
-- ==============================================================================
COMMENT ON TABLE public.product_app_relations IS '商品与应用关联表：定义商品在特定SaaS应用中的上架状态、价格和配置';
COMMENT ON COLUMN public.product_app_relations.id IS '关联记录ID';
COMMENT ON COLUMN public.product_app_relations.product_id IS '关联商品ID';
COMMENT ON COLUMN public.product_app_relations.app_id IS '关联应用ID';
COMMENT ON COLUMN public.product_app_relations.is_on_sale IS '是否在该应用上架';
COMMENT ON COLUMN public.product_app_relations.sell_price IS '应用专属售价 (若设置则覆盖基础价格)';
COMMENT ON COLUMN public.product_app_relations.sort_order IS '应用内显示排序权重';
COMMENT ON COLUMN public.product_app_relations.app_tags IS '应用专属标签数组';
COMMENT ON COLUMN public.product_app_relations.created_at IS '创建时间';
COMMENT ON COLUMN public.product_app_relations.updated_at IS '更新时间';

-- ==============================================================================
-- 8. product_categories (产品分类)
-- ==============================================================================
COMMENT ON COLUMN public.product_categories.id IS '分类ID';
COMMENT ON COLUMN public.product_categories.description IS '分类详细描述';
COMMENT ON COLUMN public.product_categories.sort_order IS '排序权重 (数字越小越靠前)';
COMMENT ON COLUMN public.product_categories.is_active IS '是否启用';
COMMENT ON COLUMN public.product_categories.created_at IS '创建时间';
COMMENT ON COLUMN public.product_categories.updated_at IS '更新时间';

-- ==============================================================================
-- 9. products (产品表)
-- ==============================================================================
COMMENT ON COLUMN public.products.description IS '商品详细图文描述';
COMMENT ON COLUMN public.products.stock IS '库存数量';
COMMENT ON COLUMN public.products.base_cost IS '商品成本价';
COMMENT ON COLUMN public.products.images IS '商品图片URL数组';
COMMENT ON COLUMN public.products.specs IS '商品规格参数 (JSONB)';
COMMENT ON COLUMN public.products.created_at IS '创建时间';
COMMENT ON COLUMN public.products.updated_at IS '更新时间';

-- Add missing comments for core tables
-- This script standardizes database comments according to project guidelines.

-- =============================================
-- Table: orders (统一订单表)
-- =============================================
COMMENT ON TABLE orders IS '统一订单主表，存储所有应用产生的订单核心信息';
COMMENT ON COLUMN orders.id IS '订单唯一主键 (UUID)';
COMMENT ON COLUMN orders.order_no IS '业务订单号 (人类可读，唯一)';
COMMENT ON COLUMN orders.app_id IS '所属应用 ID (区分订单来源)';
COMMENT ON COLUMN orders.user_id IS '下单用户 ID';
COMMENT ON COLUMN orders.total_amount IS '订单总金额 (单位：分或最小货币单位)';
COMMENT ON COLUMN orders.pay_amount IS '实际支付金额 (扣除优惠后)';
COMMENT ON COLUMN orders.pay_status IS '支付状态 (Pending, Paid, Failed, Refunded)';
COMMENT ON COLUMN orders.items_snapshot IS '订单商品快照 (JSON 格式，包含购买时的价格、名称等)';
COMMENT ON COLUMN orders.shipping_info IS '收货/配送信息快照 (JSON 格式)';
COMMENT ON COLUMN orders.status IS '订单生命周期状态 (Created, Processing, Completed, Cancelled)';
COMMENT ON COLUMN orders.created_at IS '订单创建时间';
COMMENT ON COLUMN orders.updated_at IS '订单最后更新时间';

-- =============================================
-- Table: product_app_relations (商品-应用关联表)
-- =============================================
COMMENT ON TABLE product_app_relations IS '商品上架与价格配置表，定义商品在不同应用中的特定属性';
COMMENT ON COLUMN product_app_relations.id IS '主键 ID';
COMMENT ON COLUMN product_app_relations.app_id IS '应用 ID';
COMMENT ON COLUMN product_app_relations.product_id IS '基础商品 ID';
COMMENT ON COLUMN product_app_relations.is_on_sale IS '是否在该应用上架销售';
COMMENT ON COLUMN product_app_relations.sell_price IS '该应用下的特定售价 (可覆盖基础价格)';
COMMENT ON COLUMN product_app_relations.app_tags IS '该应用下的商品标签 (数组)';
COMMENT ON COLUMN product_app_relations.created_at IS '创建时间';

-- =============================================
-- Table: user_app_relations (用户-应用关联表)
-- =============================================
COMMENT ON TABLE user_app_relations IS '用户应用画像表，存储用户在特定应用下的个性化数据';
COMMENT ON COLUMN user_app_relations.id IS '主键 ID';
COMMENT ON COLUMN user_app_relations.user_id IS '用户全局 ID';
COMMENT ON COLUMN user_app_relations.app_id IS '应用 ID';
COMMENT ON COLUMN user_app_relations.vip_level IS '该应用内的 VIP 等级';
COMMENT ON COLUMN user_app_relations.points IS '该应用内的积分余额';
COMMENT ON COLUMN user_app_relations.tags IS '用户在该应用下的标签 (数组)';
COMMENT ON COLUMN user_app_relations.custom_data IS '扩展数据 (JSON)，存储应用特有的用户配置';
COMMENT ON COLUMN user_app_relations.last_active_at IS '用户最后一次在该应用活跃的时间';
COMMENT ON COLUMN user_app_relations.created_at IS '关联创建时间';

-- =============================================
-- Table: saas_apps (补充注释)
-- =============================================
COMMENT ON TABLE saas_apps IS 'SaaS 应用主表，定义平台下的所有子应用';
COMMENT ON COLUMN saas_apps.id IS '应用唯一标识 (App ID)';
COMMENT ON COLUMN saas_apps.name IS '应用名称';
COMMENT ON COLUMN saas_apps.api_key IS 'API 公钥 (Publishable Key)，可用于前端';
COMMENT ON COLUMN saas_apps.owner_id IS '应用所有者 ID';
COMMENT ON COLUMN saas_apps.config IS '应用全局配置 (JSON)，包含 AI 模型配置等';
COMMENT ON COLUMN saas_apps.status IS '应用状态 (Development, Active, Suspended)';

-- =============================================
-- Table: api_access_logs (API 访问日志)
-- =============================================
COMMENT ON TABLE api_access_logs IS 'API 访问日志表，记录所有 Open API 的调用详情';
COMMENT ON COLUMN api_access_logs.id IS '日志唯一主键';
COMMENT ON COLUMN api_access_logs.app_id IS '调用 API 的应用 ID';
COMMENT ON COLUMN api_access_logs.endpoint IS '请求的 API 路径 (如 /api/v1/products)';
COMMENT ON COLUMN api_access_logs.method IS 'HTTP 请求方法 (GET, POST, etc.)';
COMMENT ON COLUMN api_access_logs.status_code IS 'HTTP 响应状态码';
COMMENT ON COLUMN api_access_logs.latency_ms IS '请求处理耗时 (毫秒)';
COMMENT ON COLUMN api_access_logs.ip_address IS '客户端 IP 地址';
COMMENT ON COLUMN api_access_logs.created_at IS '日志记录时间';

-- =============================================
-- Table: app_pay_configs (应用支付配置)
-- =============================================
COMMENT ON TABLE app_pay_configs IS '应用支付配置表，存储不同支付渠道的商户参数';
COMMENT ON COLUMN app_pay_configs.id IS '配置唯一主键';
COMMENT ON COLUMN app_pay_configs.app_id IS '所属应用 ID';
COMMENT ON COLUMN app_pay_configs.channel IS '支付渠道 (wechat, alipay, unionpay)';
COMMENT ON COLUMN app_pay_configs.merchant_id IS '商户号 (MCHID)';
COMMENT ON COLUMN app_pay_configs.merchant_key IS '商户密钥或证书内容 (敏感数据)';
COMMENT ON COLUMN app_pay_configs.notify_url IS '支付结果回调通知地址';
COMMENT ON COLUMN app_pay_configs.is_enabled IS '该支付渠道是否启用';
COMMENT ON COLUMN app_pay_configs.created_at IS '配置创建时间';

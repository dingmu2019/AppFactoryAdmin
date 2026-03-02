
-- 补充 sys_webhooks 表及字段的中文注释
COMMENT ON TABLE public.sys_webhooks IS 'Webhook 订阅表：存储各个 SaaS 应用配置的外部回调地址';
COMMENT ON COLUMN public.sys_webhooks.id IS '唯一标识符 (UUID)';
COMMENT ON COLUMN public.sys_webhooks.app_id IS '所属 SaaS 应用的唯一 ID';
COMMENT ON COLUMN public.sys_webhooks.url IS '接收回调的外部目标 URL 地址';
COMMENT ON COLUMN public.sys_webhooks.secret IS '用于 HMAC 签名的密钥，确保回调请求的来源合法性';
COMMENT ON COLUMN public.sys_webhooks.events IS '订阅的事件类型列表 (例如: order.paid, user.signup)';
COMMENT ON COLUMN public.sys_webhooks.is_active IS '该 Webhook 订阅是否处于启用状态';
COMMENT ON COLUMN public.sys_webhooks.created_at IS '记录创建时间';
COMMENT ON COLUMN public.sys_webhooks.updated_at IS '最后更新时间';

-- 补充 sys_webhook_events 表及字段的中文注释
COMMENT ON TABLE public.sys_webhook_events IS 'Webhook 事件记录表：记录所有触发的 Webhook 事件及其投递状态';
COMMENT ON COLUMN public.sys_webhook_events.id IS '唯一标识符 (UUID)';
COMMENT ON COLUMN public.sys_webhook_events.webhook_id IS '关联的 Webhook 订阅 ID';
COMMENT ON COLUMN public.sys_webhook_events.event_type IS '事件类型 (例如: order.paid)';
COMMENT ON COLUMN public.sys_webhook_events.payload IS '事件的数据负载 (JSON 格式)';
COMMENT ON COLUMN public.sys_webhook_events.status IS '投递状态码：0 为待处理，200 为成功，其他为 HTTP 错误码';
COMMENT ON COLUMN public.sys_webhook_events.response_body IS '接收端返回的响应内容 (用于排查错误)';
COMMENT ON COLUMN public.sys_webhook_events.attempt_count IS '当前已重试投递的次数';
COMMENT ON COLUMN public.sys_webhook_events.next_retry_at IS '下一次计划重试投递的时间';
COMMENT ON COLUMN public.sys_webhook_events.created_at IS '事件触发并创建的时间';

-- 补充 subscriptions 表及字段的中文注释
COMMENT ON TABLE public.subscriptions IS '订阅表：记录用户对 SaaS 应用的付费订阅信息';
COMMENT ON COLUMN public.subscriptions.id IS '唯一标识符 (UUID)';
COMMENT ON COLUMN public.subscriptions.app_id IS '所属 SaaS 应用的 ID';
COMMENT ON COLUMN public.subscriptions.user_id IS '订阅用户的唯一 ID (关联 auth.users)';
COMMENT ON COLUMN public.subscriptions.provider IS '支付服务提供商 (例如: stripe, wechat, manual)';
COMMENT ON COLUMN public.subscriptions.external_subscription_id IS '外部支付平台的订阅 ID (如 Stripe 的 sub_xxx)';
COMMENT ON COLUMN public.subscriptions.external_customer_id IS '外部支付平台的客户 ID (如 Stripe 的 cus_xxx)';
COMMENT ON COLUMN public.subscriptions.plan_key IS '订阅方案的唯一标识符 (例如: pro_monthly, basic_yearly)';
COMMENT ON COLUMN public.subscriptions.status IS '订阅状态 (例如: active-活跃, past_due-逾期, canceled-已取消, incomplete-未完成)';
COMMENT ON COLUMN public.subscriptions.current_period_start IS '当前账期开始时间';
COMMENT ON COLUMN public.subscriptions.current_period_end IS '当前账期结束时间';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS '是否在当前账期结束后自动取消订阅';
COMMENT ON COLUMN public.subscriptions.canceled_at IS '订阅被取消的具体时间';
COMMENT ON COLUMN public.subscriptions.created_at IS '订阅创建时间';
COMMENT ON COLUMN public.subscriptions.updated_at IS '订阅最后更新时间';

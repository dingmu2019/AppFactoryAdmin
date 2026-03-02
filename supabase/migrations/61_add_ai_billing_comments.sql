
-- 补充 AI 计费与用量统计相关表的中文注释

-- ==============================================================================
-- 1. ai_usage_events (AI 用量明细表)
-- ==============================================================================
COMMENT ON TABLE public.ai_usage_events IS 'AI 用量明细表：记录每一次 AI 网关调用的详细用量、成本及积分扣费情况';
COMMENT ON COLUMN public.ai_usage_events.id IS '唯一标识符 (UUID)';
COMMENT ON COLUMN public.ai_usage_events.request_id IS '请求唯一 ID，用于关联日志和流水';
COMMENT ON COLUMN public.ai_usage_events.app_id IS '所属 SaaS 应用 ID';
COMMENT ON COLUMN public.ai_usage_events.user_id IS '执行调用的用户 ID';
COMMENT ON COLUMN public.ai_usage_events.endpoint IS '调用的 API 终端路径';
COMMENT ON COLUMN public.ai_usage_events.provider IS 'AI 模型供应商 (如: openai, google, deepseek)';
COMMENT ON COLUMN public.ai_usage_events.model IS '使用的模型名称 (如: gpt-4, gemini-pro)';
COMMENT ON COLUMN public.ai_usage_events.prompt_tokens IS '输入提示词消耗的 Token 数';
COMMENT ON COLUMN public.ai_usage_events.completion_tokens IS '模型生成内容消耗的 Token 数';
COMMENT ON COLUMN public.ai_usage_events.total_tokens IS '总消耗 Token 数';
COMMENT ON COLUMN public.ai_usage_events.status_code IS 'HTTP 响应状态码';
COMMENT ON COLUMN public.ai_usage_events.error_message IS '调用失败时的错误描述';
COMMENT ON COLUMN public.ai_usage_events.cost_usd IS '本次调用的原始美元成本 (基于供应商定价)';
COMMENT ON COLUMN public.ai_usage_events.credits_estimated IS '预估扣除的积分数 (请求开始时计算)';
COMMENT ON COLUMN public.ai_usage_events.credits_charged IS '实际扣除的积分数 (请求结束后结算)';
COMMENT ON COLUMN public.ai_usage_events.created_at IS '记录创建时间';
COMMENT ON COLUMN public.ai_usage_events.updated_at IS '最后更新时间';

-- ==============================================================================
-- 2. ai_credit_accounts (AI 积分账户表)
-- ==============================================================================
COMMENT ON TABLE public.ai_credit_accounts IS 'AI 积分账户表：维护每个应用当前的积分余额与冻结状态';
COMMENT ON COLUMN public.ai_credit_accounts.app_id IS '所属应用 ID (主键)';
COMMENT ON COLUMN public.ai_credit_accounts.balance_credits IS '账户可用积分余额';
COMMENT ON COLUMN public.ai_credit_accounts.reserved_credits IS '当前正在处理中的冻结积分 (预扣除)';
COMMENT ON COLUMN public.ai_credit_accounts.updated_at IS '最后余额变动时间';

-- ==============================================================================
-- 3. ai_credit_ledger (AI 积分流水表)
-- ==============================================================================
COMMENT ON TABLE public.ai_credit_ledger IS 'AI 积分流水表：记录所有积分充值、冻结、消耗及回滚的收支明细';
COMMENT ON COLUMN public.ai_credit_ledger.id IS '唯一标识符 (UUID)';
COMMENT ON COLUMN public.ai_credit_ledger.app_id IS '所属应用 ID';
COMMENT ON COLUMN public.ai_credit_ledger.user_id IS '操作关联的用户 ID';
COMMENT ON COLUMN public.ai_credit_ledger.kind IS '交易类型 (TOPUP-充值, RESERVE-冻结, CONSUME-消耗, REFUND-退款)';
COMMENT ON COLUMN public.ai_credit_ledger.delta_balance IS '可用余额变动量';
COMMENT ON COLUMN public.ai_credit_ledger.delta_reserved IS '冻结余额变动量';
COMMENT ON COLUMN public.ai_credit_ledger.ref_type IS '外部引用类型 (如: ORDER, AI_REQUEST)';
COMMENT ON COLUMN public.ai_credit_ledger.ref_id IS '外部引用 ID (如订单号或请求 ID)';
COMMENT ON COLUMN public.ai_credit_ledger.request_id IS '关联的 AI 请求 ID';
COMMENT ON COLUMN public.ai_credit_ledger.details IS '流水的附加描述或元数据 (JSON)';
COMMENT ON COLUMN public.ai_credit_ledger.created_at IS '流水产生时间';

-- ==============================================================================
-- 4. ai_model_pricing (AI 模型定价表)
-- ==============================================================================
COMMENT ON TABLE public.ai_model_pricing IS 'AI 模型定价表：配置各供应商不同模型的成本单价';
COMMENT ON COLUMN public.ai_model_pricing.provider IS '供应商标识 (如: openai)';
COMMENT ON COLUMN public.ai_model_pricing.model IS '模型名称 (如: gpt-4o)';
COMMENT ON COLUMN public.ai_model_pricing.input_usd_per_1m IS '每 100 万输入 Token 的美元价格';
COMMENT ON COLUMN public.ai_model_pricing.output_usd_per_1m IS '每 100 万输出 Token 的美元价格';
COMMENT ON COLUMN public.ai_model_pricing.is_active IS '该定价策略是否有效';
COMMENT ON COLUMN public.ai_model_pricing.updated_at IS '定价最后更新时间';

-- ==============================================================================
-- 5. billing_meters (计费项定义表)
-- ==============================================================================
COMMENT ON TABLE public.billing_meters IS '计费项定义表：定义通用的计费指标及其单价';
COMMENT ON COLUMN public.billing_meters.id IS '唯一标识符 (UUID)';
COMMENT ON COLUMN public.billing_meters.metric_key IS '计费项唯一键 (如: api_call, storage_gb)';
COMMENT ON COLUMN public.billing_meters.name IS '计费项显示名称';
COMMENT ON COLUMN public.billing_meters.description IS '计费项详细说明';
COMMENT ON COLUMN public.billing_meters.price_per_unit IS '每单位数量的单价';
COMMENT ON COLUMN public.billing_meters.currency IS '结算币种 (默认 CNY)';
COMMENT ON COLUMN public.billing_meters.unit_name IS '计量单位名称 (如: 次, GB, Token)';
COMMENT ON COLUMN public.billing_meters.is_active IS '计费项是否启用';
COMMENT ON COLUMN public.billing_meters.created_at IS '计费项创建时间';

-- ==============================================================================
-- 6. metering_events (计量事件表)
-- ==============================================================================
COMMENT ON TABLE public.metering_events IS '计量事件表：记录各应用产生的原始计量数据，用于后续汇总扣费';
COMMENT ON COLUMN public.metering_events.id IS '唯一标识符 (UUID)';
COMMENT ON COLUMN public.metering_events.app_id IS '所属应用 ID';
COMMENT ON COLUMN public.metering_events.metric_key IS '关联的计费项键名';
COMMENT ON COLUMN public.metering_events.amount IS '产生的计量数值 (如消耗的流量或请求次数)';
COMMENT ON COLUMN public.metering_events.dimensions IS '多维度属性 (JSON，如模型、路径、地理位置等)';
COMMENT ON COLUMN public.metering_events.recorded_at IS '事件实际发生的时间';
COMMENT ON COLUMN public.metering_events.processed_at IS '该事件被计费引擎处理完成的时间 (为空表示待处理)';

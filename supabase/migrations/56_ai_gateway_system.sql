CREATE TABLE IF NOT EXISTS public.ai_gateway_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id VARCHAR(255) NOT NULL UNIQUE REFERENCES public.saas_apps(id) ON DELETE CASCADE,
  default_model VARCHAR(100),
  allowed_models TEXT[] DEFAULT '{}'::text[],
  allow_tools BOOLEAN NOT NULL DEFAULT false,
  allow_content_logging BOOLEAN NOT NULL DEFAULT false,
  max_input_tokens INTEGER,
  max_output_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_gateway_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(64) NOT NULL,
  app_id VARCHAR(255) NOT NULL REFERENCES public.saas_apps(id) ON DELETE CASCADE,
  endpoint VARCHAR(128) NOT NULL,
  provider VARCHAR(32),
  model VARCHAR(100),
  status_code INTEGER NOT NULL,
  latency_ms INTEGER,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_gateway_requests_app_time ON public.ai_gateway_requests(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_requests_request_id ON public.ai_gateway_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_requests_model ON public.ai_gateway_requests(model);

COMMENT ON TABLE public.ai_gateway_policies IS 'AI网关策略（按应用/租户配置默认模型、可用模型与能力开关）';
COMMENT ON COLUMN public.ai_gateway_policies.app_id IS '应用ID（saas_apps.id）';
COMMENT ON COLUMN public.ai_gateway_policies.default_model IS '默认模型（当请求未指定model时使用）';
COMMENT ON COLUMN public.ai_gateway_policies.allowed_models IS '允许使用的模型列表（为空表示不限制）';
COMMENT ON COLUMN public.ai_gateway_policies.allow_tools IS '是否允许外部请求携带工具定义（tool calling）';
COMMENT ON COLUMN public.ai_gateway_policies.allow_content_logging IS '是否允许保存内容日志（默认关闭）';
COMMENT ON COLUMN public.ai_gateway_policies.max_input_tokens IS '输入token上限（可选，网关侧校验/截断策略）';
COMMENT ON COLUMN public.ai_gateway_policies.max_output_tokens IS '输出token上限（可选）';
COMMENT ON COLUMN public.ai_gateway_policies.created_at IS '创建时间';
COMMENT ON COLUMN public.ai_gateway_policies.updated_at IS '更新时间';

COMMENT ON TABLE public.ai_gateway_requests IS 'AI网关请求日志（不含内容，记录模型/用量/耗时/状态）';
COMMENT ON COLUMN public.ai_gateway_requests.request_id IS '请求追踪ID';
COMMENT ON COLUMN public.ai_gateway_requests.app_id IS '应用ID（saas_apps.id）';
COMMENT ON COLUMN public.ai_gateway_requests.endpoint IS '网关端点（如 /api/v1/ai/chat/completions）';
COMMENT ON COLUMN public.ai_gateway_requests.provider IS '实际调用的提供商（openai/google/deepseek等）';
COMMENT ON COLUMN public.ai_gateway_requests.model IS '实际使用的模型';
COMMENT ON COLUMN public.ai_gateway_requests.status_code IS 'HTTP状态码';
COMMENT ON COLUMN public.ai_gateway_requests.latency_ms IS '耗时（毫秒）';
COMMENT ON COLUMN public.ai_gateway_requests.prompt_tokens IS '输入token数';
COMMENT ON COLUMN public.ai_gateway_requests.completion_tokens IS '输出token数';
COMMENT ON COLUMN public.ai_gateway_requests.total_tokens IS '总token数';
COMMENT ON COLUMN public.ai_gateway_requests.error_message IS '错误信息（如有）';
COMMENT ON COLUMN public.ai_gateway_requests.created_at IS '创建时间';

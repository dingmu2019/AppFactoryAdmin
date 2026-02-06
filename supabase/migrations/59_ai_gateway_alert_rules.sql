CREATE TABLE IF NOT EXISTS public.ai_gateway_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  token_usage_threshold NUMERIC NOT NULL DEFAULT 0.8,
  request_usage_threshold NUMERIC NOT NULL DEFAULT 0.8,
  error_rate_threshold NUMERIC NOT NULL DEFAULT 0.05,
  p95_latency_threshold_ms INTEGER NOT NULL DEFAULT 2000,
  window_minutes INTEGER NOT NULL DEFAULT 60,
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  recipients TEXT[] NOT NULL DEFAULT '{}'::text[],
  last_token_alert_at TIMESTAMPTZ,
  last_request_alert_at TIMESTAMPTZ,
  last_error_alert_at TIMESTAMPTZ,
  last_p95_alert_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_gateway_alert_rules_app_id ON public.ai_gateway_alert_rules(app_id);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_alert_rules_enabled ON public.ai_gateway_alert_rules(is_enabled);

COMMENT ON TABLE public.ai_gateway_alert_rules IS 'AI 网关告警规则（按 app 配置阈值与接收人）';
COMMENT ON COLUMN public.ai_gateway_alert_rules.token_usage_threshold IS '当日 token 使用占比阈值（0-1），仅在设置了 daily_token_limit 时生效';
COMMENT ON COLUMN public.ai_gateway_alert_rules.request_usage_threshold IS '当日请求次数使用占比阈值（0-1），仅在设置了 daily_request_limit 时生效';
COMMENT ON COLUMN public.ai_gateway_alert_rules.error_rate_threshold IS '窗口期失败率阈值（0-1），基于 status_code>=400';
COMMENT ON COLUMN public.ai_gateway_alert_rules.p95_latency_threshold_ms IS '窗口期 P95 latency 阈值（毫秒）';
COMMENT ON COLUMN public.ai_gateway_alert_rules.window_minutes IS '告警窗口（分钟）';
COMMENT ON COLUMN public.ai_gateway_alert_rules.cooldown_minutes IS '同类告警冷却时间（分钟）';

CREATE OR REPLACE FUNCTION public.ai_gateway_window_metrics(p_app_id TEXT, p_minutes INTEGER)
RETURNS TABLE(
  request_count BIGINT,
  error_count BIGINT,
  error_rate NUMERIC,
  p95_latency_ms NUMERIC,
  total_tokens BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
WITH params AS (
  SELECT
    (now() AT TIME ZONE 'utc') AS now_utc,
    GREATEST(1, COALESCE(p_minutes, 60))::int AS minutes
),
agg AS (
  SELECT
    COUNT(*)::bigint AS request_count,
    COUNT(*) FILTER (WHERE r.status_code >= 400)::bigint AS error_count,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY r.latency_ms) FILTER (WHERE r.latency_ms IS NOT NULL) AS p95_latency_ms,
    COALESCE(SUM(r.total_tokens), 0)::bigint AS total_tokens
  FROM public.ai_gateway_requests r
  WHERE r.app_id = p_app_id
    AND r.created_at >= ((SELECT now_utc FROM params) - make_interval(mins => (SELECT minutes FROM params)))
)
SELECT
  a.request_count,
  a.error_count,
  CASE WHEN a.request_count = 0 THEN 0 ELSE (a.error_count::numeric / a.request_count::numeric) END AS error_rate,
  COALESCE(a.p95_latency_ms, 0) AS p95_latency_ms,
  a.total_tokens
FROM agg a;
$$;


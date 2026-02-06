ALTER TABLE public.ai_gateway_policies
  ADD COLUMN IF NOT EXISTS daily_token_limit INTEGER,
  ADD COLUMN IF NOT EXISTS daily_request_limit INTEGER;

COMMENT ON COLUMN public.ai_gateway_policies.daily_token_limit IS '每日token限额（total_tokens），为空表示不限制';
COMMENT ON COLUMN public.ai_gateway_policies.daily_request_limit IS '每日请求次数限额，为空表示不限制';

CREATE OR REPLACE FUNCTION public.ai_gateway_usage_today(p_app_id UUID)
RETURNS TABLE(total_tokens BIGINT, request_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_ts TIMESTAMPTZ;
BEGIN
  start_ts := (date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc');

  RETURN QUERY
  SELECT
    COALESCE(SUM(r.total_tokens), 0)::bigint AS total_tokens,
    COUNT(*)::bigint AS request_count
  FROM public.ai_gateway_requests r
  WHERE r.app_id = p_app_id
    AND r.created_at >= start_ts;
END;
$$;

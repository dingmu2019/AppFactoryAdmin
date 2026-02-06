CREATE OR REPLACE FUNCTION public.ai_gateway_check_and_reserve(
  p_app_id TEXT,
  p_request_id TEXT,
  p_estimated_tokens INTEGER,
  p_estimated_credits BIGINT,
  p_user_id UUID DEFAULT NULL,
  p_endpoint TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  error_code TEXT,
  message TEXT,
  balance_credits BIGINT,
  reserved_credits BIGINT,
  daily_tokens BIGINT,
  daily_requests BIGINT,
  daily_token_limit INTEGER,
  daily_request_limit INTEGER,
  daily_credits BIGINT,
  daily_credit_limit BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pol RECORD;
  day_utc DATE := (now() AT TIME ZONE 'utc')::date;
  used_tokens BIGINT := 0;
  used_requests BIGINT := 0;
  used_credits BIGINT := 0;
  bal BIGINT := 0;
  resv BIGINT := 0;
  limit_tokens INTEGER;
  limit_requests INTEGER;
  limit_credits BIGINT;
  bill BOOLEAN := FALSE;
BEGIN
  SELECT
    p.daily_token_limit,
    p.daily_request_limit,
    p.enforce_billing,
    p.daily_credit_limit
  INTO pol
  FROM public.ai_gateway_policies p
  WHERE p.app_id = p_app_id
  LIMIT 1;

  SELECT
    COALESCE(d.total_tokens, 0),
    COALESCE(d.request_count, 0),
    COALESCE(d.credits_charged, 0)
  INTO used_tokens, used_requests, used_credits
  FROM public.ai_gateway_usage_daily d
  WHERE d.app_id = p_app_id
    AND d.day = day_utc
  LIMIT 1;

  limit_tokens := COALESCE(pol.daily_token_limit, NULL);
  limit_requests := COALESCE(pol.daily_request_limit, NULL);
  limit_credits := COALESCE(pol.daily_credit_limit, NULL);
  bill := COALESCE(pol.enforce_billing, FALSE);

  IF limit_requests IS NOT NULL AND used_requests + 1 > limit_requests THEN
    RETURN QUERY SELECT FALSE, 'DAILY_REQUEST_LIMIT', 'Daily request quota exceeded', NULL, NULL, used_tokens, used_requests, limit_tokens, limit_requests, used_credits, limit_credits;
    RETURN;
  END IF;

  IF limit_tokens IS NOT NULL AND used_tokens + GREATEST(0, p_estimated_tokens) > limit_tokens THEN
    RETURN QUERY SELECT FALSE, 'DAILY_TOKEN_LIMIT', 'Daily token quota exceeded', NULL, NULL, used_tokens, used_requests, limit_tokens, limit_requests, used_credits, limit_credits;
    RETURN;
  END IF;

  IF bill THEN
    PERFORM public.ai_credits_ensure_account(p_app_id);

    IF limit_credits IS NOT NULL AND used_credits + GREATEST(0, p_estimated_credits) > limit_credits THEN
      SELECT a.balance_credits, a.reserved_credits INTO bal, resv FROM public.ai_credit_accounts a WHERE a.app_id = p_app_id LIMIT 1;
      RETURN QUERY SELECT FALSE, 'DAILY_CREDIT_LIMIT', 'Daily credit quota exceeded', bal, resv, used_tokens, used_requests, limit_tokens, limit_requests, used_credits, limit_credits;
      RETURN;
    END IF;

    UPDATE public.ai_credit_accounts a
    SET reserved_credits = a.reserved_credits + GREATEST(0, p_estimated_credits),
        updated_at = now()
    WHERE a.app_id = p_app_id
      AND (a.balance_credits - a.reserved_credits) >= GREATEST(0, p_estimated_credits)
    RETURNING a.balance_credits, a.reserved_credits INTO bal, resv;

    IF NOT FOUND THEN
      SELECT a.balance_credits, a.reserved_credits INTO bal, resv FROM public.ai_credit_accounts a WHERE a.app_id = p_app_id LIMIT 1;
      RETURN QUERY SELECT FALSE, 'INSUFFICIENT_CREDITS', 'Insufficient credits', bal, resv, used_tokens, used_requests, limit_tokens, limit_requests, used_credits, limit_credits;
      RETURN;
    END IF;

    INSERT INTO public.ai_credit_ledger(app_id, user_id, kind, delta_balance, delta_reserved, request_id, details)
    VALUES (p_app_id, p_user_id, 'RESERVE', 0, GREATEST(0, p_estimated_credits), p_request_id, '{}'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.ai_usage_events(
    request_id, app_id, user_id, endpoint, provider, model, credits_estimated, created_at, updated_at
  ) VALUES (
    p_request_id, p_app_id, p_user_id, p_endpoint, p_provider, p_model, COALESCE(p_estimated_credits, 0), now(), now()
  )
  ON CONFLICT (request_id) DO NOTHING;

  RETURN QUERY SELECT TRUE, NULL, NULL, COALESCE(bal, NULL), COALESCE(resv, NULL), used_tokens, used_requests, limit_tokens, limit_requests, used_credits, limit_credits;
END;
$$;

INSERT INTO public.ai_gateway_usage_daily(app_id, day, request_count, total_tokens, credits_charged, cost_usd)
SELECT
  r.app_id,
  (r.created_at AT TIME ZONE 'utc')::date AS day,
  COUNT(*)::bigint AS request_count,
  COALESCE(SUM(r.total_tokens), 0)::bigint AS total_tokens,
  0::bigint AS credits_charged,
  0::numeric AS cost_usd
FROM public.ai_gateway_requests r
WHERE r.created_at >= (now() AT TIME ZONE 'utc') - interval '30 days'
GROUP BY r.app_id, (r.created_at AT TIME ZONE 'utc')::date
ON CONFLICT (app_id, day) DO UPDATE SET
  request_count = GREATEST(public.ai_gateway_usage_daily.request_count, EXCLUDED.request_count),
  total_tokens = GREATEST(public.ai_gateway_usage_daily.total_tokens, EXCLUDED.total_tokens);


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
    daily_token_limit,
    daily_request_limit,
    enforce_billing,
    daily_credit_limit
  INTO pol
  FROM public.ai_gateway_policies
  WHERE app_id = p_app_id
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
      SELECT balance_credits, reserved_credits INTO bal, resv FROM public.ai_credit_accounts WHERE app_id = p_app_id LIMIT 1;
      RETURN QUERY SELECT FALSE, 'DAILY_CREDIT_LIMIT', 'Daily credit quota exceeded', bal, resv, used_tokens, used_requests, limit_tokens, limit_requests, used_credits, limit_credits;
      RETURN;
    END IF;

    UPDATE public.ai_credit_accounts
    SET reserved_credits = reserved_credits + GREATEST(0, p_estimated_credits),
        updated_at = now()
    WHERE app_id = p_app_id
      AND (balance_credits - reserved_credits) >= GREATEST(0, p_estimated_credits)
    RETURNING balance_credits, reserved_credits INTO bal, resv;

    IF NOT FOUND THEN
      SELECT balance_credits, reserved_credits INTO bal, resv FROM public.ai_credit_accounts WHERE app_id = p_app_id LIMIT 1;
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

CREATE OR REPLACE FUNCTION public.ai_gateway_finalize(
  p_app_id TEXT,
  p_request_id TEXT,
  p_prompt_tokens INTEGER,
  p_completion_tokens INTEGER,
  p_total_tokens INTEGER,
  p_status_code INTEGER,
  p_error_message TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_cost_usd NUMERIC DEFAULT 0,
  p_credits_charged BIGINT DEFAULT 0
)
RETURNS TABLE(
  ok BOOLEAN,
  error_code TEXT,
  message TEXT,
  balance_credits BIGINT,
  reserved_credits BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  day_utc DATE := (now() AT TIME ZONE 'utc')::date;
  pol RECORD;
  ev RECORD;
  bal BIGINT;
  resv BIGINT;
  est BIGINT := 0;
  charged BIGINT := 0;
  has_reserve BOOLEAN := FALSE;
BEGIN
  SELECT enforce_billing INTO pol
  FROM public.ai_gateway_policies
  WHERE app_id = p_app_id
  LIMIT 1;

  SELECT * INTO ev FROM public.ai_usage_events WHERE request_id = p_request_id LIMIT 1;
  est := COALESCE(ev.credits_estimated, 0);
  charged := LEAST(GREATEST(0, COALESCE(p_credits_charged, 0)), est);

  UPDATE public.ai_usage_events
  SET
    prompt_tokens = GREATEST(0, COALESCE(p_prompt_tokens, 0)),
    completion_tokens = GREATEST(0, COALESCE(p_completion_tokens, 0)),
    total_tokens = GREATEST(0, COALESCE(p_total_tokens, 0)),
    status_code = p_status_code,
    error_message = p_error_message,
    provider = COALESCE(p_provider, provider),
    model = COALESCE(p_model, model),
    cost_usd = GREATEST(0, COALESCE(p_cost_usd, 0)),
    credits_charged = charged,
    updated_at = now()
  WHERE request_id = p_request_id;

  INSERT INTO public.ai_gateway_usage_daily(app_id, day, request_count, total_tokens, credits_charged, cost_usd)
  VALUES (
    p_app_id,
    day_utc,
    1,
    GREATEST(0, COALESCE(p_total_tokens, 0)),
    charged,
    GREATEST(0, COALESCE(p_cost_usd, 0))
  )
  ON CONFLICT (app_id, day) DO UPDATE SET
    request_count = public.ai_gateway_usage_daily.request_count + 1,
    total_tokens = public.ai_gateway_usage_daily.total_tokens + EXCLUDED.total_tokens,
    credits_charged = public.ai_gateway_usage_daily.credits_charged + EXCLUDED.credits_charged,
    cost_usd = public.ai_gateway_usage_daily.cost_usd + EXCLUDED.cost_usd;

  IF COALESCE(pol.enforce_billing, FALSE) THEN
    SELECT EXISTS(
      SELECT 1 FROM public.ai_credit_ledger l
      WHERE l.kind = 'RESERVE'
        AND l.request_id = p_request_id
        AND l.app_id = p_app_id
      LIMIT 1
    ) INTO has_reserve;

    IF has_reserve THEN
      PERFORM public.ai_credits_ensure_account(p_app_id);

      UPDATE public.ai_credit_accounts
      SET
        reserved_credits = GREATEST(0, reserved_credits - est),
        balance_credits = balance_credits - charged,
        updated_at = now()
      WHERE app_id = p_app_id
        AND balance_credits >= charged
      RETURNING balance_credits, reserved_credits INTO bal, resv;

      IF NOT FOUND THEN
        SELECT balance_credits, reserved_credits INTO bal, resv FROM public.ai_credit_accounts WHERE app_id = p_app_id LIMIT 1;
        RETURN QUERY SELECT FALSE, 'INSUFFICIENT_CREDITS_AT_FINALIZE', 'Insufficient credits at finalize', bal, resv;
        RETURN;
      END IF;

      INSERT INTO public.ai_credit_ledger(app_id, user_id, kind, delta_balance, delta_reserved, request_id, ref_type, ref_id, details)
      VALUES (p_app_id, ev.user_id, 'CONSUME', -charged, -est, p_request_id, 'AI_REQUEST', p_request_id, '{}'::jsonb)
      ON CONFLICT DO NOTHING;

      RETURN QUERY SELECT TRUE, NULL, NULL, bal, resv;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT TRUE, NULL, NULL, NULL, NULL;
END;
$$;


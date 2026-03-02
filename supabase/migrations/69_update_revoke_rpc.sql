
-- Update ai_credits_revoke_from_order to also update user_app_relations.points

CREATE OR REPLACE FUNCTION public.ai_credits_revoke_from_order(
    p_order_id UUID, 
    p_refund_id UUID, 
    p_revoke_ratio DECIMAL DEFAULT 1.0
)
RETURNS TABLE(ok BOOLEAN, credits_revoked BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ord RECORD;
  total_credits_granted BIGINT := 0;
  to_revoke BIGINT := 0;
BEGIN
  -- 1. Get Order Info
  SELECT id, app_id, user_id, items_snapshot INTO ord
  FROM public.orders
  WHERE id = p_order_id
  LIMIT 1;

  IF ord.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::bigint;
    RETURN;
  END IF;

  -- 2. Calculate total credits that WERE granted (sum from snapshot)
  SELECT COALESCE(SUM(
    CASE
      WHEN (item->>'type') = 'credits' THEN
        COALESCE(NULLIF((item->>'credits'), '')::bigint, 0)
        + COALESCE(NULLIF((item->'specs'->>'credits'), '')::bigint, 0)
      ELSE 0
    END
  ), 0)
  INTO total_credits_granted
  FROM jsonb_array_elements(ord.items_snapshot::jsonb) item;

  IF total_credits_granted <= 0 THEN
    RETURN QUERY SELECT TRUE, 0::bigint;
    RETURN;
  END IF;

  -- 3. Calculate how much to revoke
  to_revoke := FLOOR(total_credits_granted * p_revoke_ratio)::bigint;
  
  IF to_revoke <= 0 THEN
    RETURN QUERY SELECT TRUE, 0::bigint;
    RETURN;
  END IF;

  -- 4. Record in Ledger
  INSERT INTO public.ai_credit_ledger(app_id, user_id, kind, delta_balance, delta_reserved, ref_type, ref_id, details)
  VALUES (
    ord.app_id, 
    ord.user_id, 
    'REVOKE', 
    -to_revoke, 
    0, 
    'REFUND', 
    p_refund_id::text, 
    jsonb_build_object('order_id', p_order_id, 'ratio', p_revoke_ratio)
  );

  -- 5. Update App Account Balance
  UPDATE public.ai_credit_accounts
  SET balance_credits = balance_credits - to_revoke,
      updated_at = now()
  WHERE app_id = ord.app_id;

  -- 6. Update User-level Points in user_app_relations
  UPDATE public.user_app_relations
  SET points = GREATEST(0, COALESCE(points, 0) - to_revoke::integer),
      updated_at = now()
  WHERE user_id = ord.user_id AND app_id = ord.app_id;

  RETURN QUERY SELECT TRUE, to_revoke;
END;
$$;

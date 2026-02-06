CREATE OR REPLACE FUNCTION public.ai_gateway_trends(p_app_id TEXT, p_days INTEGER)
RETURNS TABLE(
  day DATE,
  total_tokens BIGINT,
  request_count BIGINT,
  error_count BIGINT,
  error_rate NUMERIC,
  p95_latency_ms NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
WITH params AS (
  SELECT
    (date_trunc('day', now() AT TIME ZONE 'utc')::date) AS end_day,
    GREATEST(1, COALESCE(p_days, 7))::int AS days
),
days AS (
  SELECT generate_series(
    (SELECT end_day - (days - 1) FROM params),
    (SELECT end_day FROM params),
    interval '1 day'
  )::date AS day
),
agg AS (
  SELECT
    (r.created_at AT TIME ZONE 'utc')::date AS day,
    COALESCE(SUM(r.total_tokens), 0)::bigint AS total_tokens,
    COUNT(*)::bigint AS request_count,
    COUNT(*) FILTER (WHERE r.status_code >= 400)::bigint AS error_count,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY r.latency_ms) FILTER (WHERE r.latency_ms IS NOT NULL) AS p95_latency_ms
  FROM public.ai_gateway_requests r
  WHERE r.app_id = p_app_id
    AND r.created_at >= ((SELECT end_day - (days - 1) FROM params) AT TIME ZONE 'utc')
  GROUP BY 1
)
SELECT
  d.day,
  COALESCE(a.total_tokens, 0) AS total_tokens,
  COALESCE(a.request_count, 0) AS request_count,
  COALESCE(a.error_count, 0) AS error_count,
  CASE WHEN COALESCE(a.request_count, 0) = 0 THEN 0 ELSE (COALESCE(a.error_count, 0)::numeric / a.request_count::numeric) END AS error_rate,
  COALESCE(a.p95_latency_ms, 0) AS p95_latency_ms
FROM days d
LEFT JOIN agg a ON a.day = d.day
ORDER BY d.day ASC;
$$;

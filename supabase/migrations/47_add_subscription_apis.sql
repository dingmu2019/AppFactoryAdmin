
-- Populate sys_api_definitions with Subscription APIs

INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required, is_active)
VALUES
  ('/api/v1/subscriptions', 'GET', 'Get My Subscription', 'Get the current active subscription for the authenticated user.', 'Subscription', true, true),
  ('/api/v1/subscriptions/cancel', 'POST', 'Cancel Subscription', 'Request cancellation of the current subscription at the end of the billing period.', 'Subscription', true, true)

ON CONFLICT (path, method) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  auth_required = EXCLUDED.auth_required,
  is_active = EXCLUDED.is_active;

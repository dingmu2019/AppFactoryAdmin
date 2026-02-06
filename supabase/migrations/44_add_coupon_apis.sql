
-- Populate sys_api_definitions with Coupon APIs

INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required, is_active)
VALUES
  ('/api/v1/coupons/verify', 'POST', 'Verify Coupon', 'Check if a coupon code is valid and return discount details.', 'Marketing', true, true)

ON CONFLICT (path, method) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  auth_required = EXCLUDED.auth_required,
  is_active = EXCLUDED.is_active;

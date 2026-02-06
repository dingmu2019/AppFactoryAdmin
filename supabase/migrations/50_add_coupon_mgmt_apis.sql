
-- Populate sys_api_definitions with Coupon Management APIs

INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required, is_active)
VALUES
  ('/api/v1/coupons', 'GET', 'List Coupons', 'List all coupons for the app.', 'Marketing', true, true),
  ('/api/v1/coupons', 'POST', 'Create Coupon', 'Create a new coupon or promo code.', 'Marketing', true, true),
  ('/api/v1/coupons/:id', 'DELETE', 'Delete Coupon', 'Delete or deactivate a coupon.', 'Marketing', true, true)

ON CONFLICT (path, method) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  auth_required = EXCLUDED.auth_required,
  is_active = EXCLUDED.is_active;

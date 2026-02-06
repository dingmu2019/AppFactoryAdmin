
-- Populate sys_api_definitions with Order APIs

INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required, is_active)
VALUES
  ('/api/v1/orders', 'POST', 'Create Order', 'Create a new order with inventory reservation. Returns the order object.', 'Order', true, true),
  ('/api/v1/orders/:id/cancel', 'POST', 'Cancel Order', 'Cancel an unpaid order and release inventory.', 'Order', true, true)

ON CONFLICT (path, method) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  auth_required = EXCLUDED.auth_required,
  is_active = EXCLUDED.is_active;

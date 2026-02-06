
-- Populate sys_api_definitions with Payment APIs

INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required, is_active)
VALUES
  ('/api/v1/payments/create', 'POST', 'Create Payment Intent', 'Initiate a payment transaction for an order. Supports Stripe, WeChat Pay, Alipay.', 'Payment', true, true),
  ('/api/v1/payments/webhook/:provider', 'POST', 'Payment Webhook', 'Callback endpoint for payment providers (e.g. Stripe) to update transaction status.', 'Payment', false, true)

ON CONFLICT (path, method) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  auth_required = EXCLUDED.auth_required,
  is_active = EXCLUDED.is_active;


-- Populate sys_api_definitions with Webhook APIs

INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required, is_active)
VALUES
  ('/api/v1/webhooks', 'GET', 'List Webhooks', 'List all webhook subscriptions for the current app.', 'Webhook', true, true),
  ('/api/v1/webhooks', 'POST', 'Create Webhook', 'Register a new webhook subscription for events.', 'Webhook', true, true),
  ('/api/v1/webhooks/:id', 'DELETE', 'Delete Webhook', 'Remove a webhook subscription.', 'Webhook', true, true)

ON CONFLICT (path, method) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  auth_required = EXCLUDED.auth_required,
  is_active = EXCLUDED.is_active;

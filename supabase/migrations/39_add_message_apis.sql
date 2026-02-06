
-- Populate sys_api_definitions with Message APIs

INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required, is_active)
VALUES
  ('/api/v1/messages/send', 'POST', 'Send Unified Message', 'Send a message via Email, SMS, or other channels. Requires configured provider.', 'Message', true, true)

ON CONFLICT (path, method) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  auth_required = EXCLUDED.auth_required,
  is_active = EXCLUDED.is_active;

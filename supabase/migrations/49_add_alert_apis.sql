
-- Populate sys_api_definitions with Alert APIs

INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required, is_active)
VALUES
  ('/api/v1/alerts', 'GET', 'List Alerts', 'Get recent error logs and alerts for the current app.', 'Monitor', true, true)

ON CONFLICT (path, method) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  auth_required = EXCLUDED.auth_required,
  is_active = EXCLUDED.is_active;

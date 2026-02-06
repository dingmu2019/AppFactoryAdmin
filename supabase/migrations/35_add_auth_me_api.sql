
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required, is_active)
VALUES
  ('/api/v1/auth/me', 'GET', 'Get Current User Profile', 'Retrieve profile and app-specific data for the currently logged-in user.', 'Auth', true, true)
ON CONFLICT (path, method) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  auth_required = EXCLUDED.auth_required,
  is_active = EXCLUDED.is_active;

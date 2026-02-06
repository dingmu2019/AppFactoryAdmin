
-- Add End-User Auth APIs to Catalog

INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required, is_active)
VALUES
  ('/api/v1/auth/send-code', 'POST', 'Send Verification Code', 'Send a 6-digit verification code to the user email for login/registration.', 'Auth', true, true),
  ('/api/v1/auth/login', 'POST', 'Login with Code', 'Authenticate user with email and verification code. Returns a scoped access token for the specific App.', 'Auth', true, true)
ON CONFLICT (path, method) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  auth_required = EXCLUDED.auth_required,
  is_active = EXCLUDED.is_active;

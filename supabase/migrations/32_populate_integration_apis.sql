
-- Populate sys_api_definitions with external integration APIs
-- This ensures these APIs are visible in the API Catalog and managed properly

INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required, is_active)
VALUES
  -- 1. Integration Configs (Read)
  ('/api/v1/integrations/llm', 'GET', 'Get LLM Configs', 'Retrieve configured LLM providers and settings (sensitive data masked).', 'Integrations', true, true),
  ('/api/v1/integrations/email', 'GET', 'Get Email Configs', 'Retrieve configured Email providers (sensitive data masked).', 'Integrations', true, true),
  ('/api/v1/integrations/database', 'GET', 'Get Database Configs', 'Retrieve configured Database connections (sensitive data masked).', 'Integrations', true, true),

  -- 2. Integration Actions (Execute)
  ('/api/v1/integrations/email/send', 'POST', 'Send Email', 'Send an email using the active email integration configuration.', 'Integrations', true, true),
  ('/api/v1/integrations/llm/chat', 'POST', 'Chat with LLM', 'Send a prompt to the active LLM provider and get a response.', 'Integrations', true, true)

ON CONFLICT (path, method) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  auth_required = EXCLUDED.auth_required,
  is_active = EXCLUDED.is_active;

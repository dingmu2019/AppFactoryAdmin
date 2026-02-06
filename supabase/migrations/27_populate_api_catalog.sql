-- Populate sys_api_definitions with scanned backend endpoints

-- Admin: App Management
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/apps', 'GET', 'Get SaaS Apps', 'Retrieve a list of all registered SaaS applications.', 'Admin', true),
('/api/admin/apps', 'POST', 'Create SaaS App', 'Create a new SaaS application with API credentials.', 'Admin', true),
('/api/admin/apps/:id', 'PUT', 'Update SaaS App', 'Update application details and configuration.', 'Admin', true),
('/api/admin/apps/:id', 'DELETE', 'Delete SaaS App', 'Permanently delete a SaaS application.', 'Admin', true),
('/api/admin/apps/:id/credentials', 'GET', 'Get App Credentials', 'Retrieve API Key and Secret for an application.', 'Admin', true),
('/api/admin/apps/:id/rotate-credentials', 'POST', 'Rotate App Credentials', 'Regenerate API Key and Secret for an application.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: API Catalog
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/apis', 'GET', 'List APIs', 'Retrieve the catalog of all system API definitions.', 'Admin', true),
('/api/admin/apis/:id', 'GET', 'Get API Details', 'Retrieve detailed information for a specific API endpoint.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: Users
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/users', 'GET', 'List Users', 'Retrieve a paginated list of system users.', 'Admin', true),
('/api/admin/users/:id', 'PUT', 'Update User', 'Update user profile and roles.', 'Admin', true),
('/api/admin/users/:id', 'DELETE', 'Delete User', 'Soft delete or ban a user account.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: RBAC
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/rbac/roles', 'GET', 'List Roles', 'Retrieve all defined RBAC roles.', 'Admin', true),
('/api/admin/rbac/roles', 'POST', 'Create Role', 'Define a new role with specific permissions.', 'Admin', true),
('/api/admin/rbac/roles/:id', 'DELETE', 'Delete Role', 'Remove a role definition.', 'Admin', true),
('/api/admin/rbac/permissions', 'GET', 'List Permissions', 'Retrieve all available system permissions.', 'Admin', true),
('/api/admin/rbac/permissions', 'POST', 'Create Permission', 'Define a new permission node.', 'Admin', true),
('/api/admin/rbac/policies', 'GET', 'List Policies', 'Retrieve access control policies.', 'Admin', true),
('/api/admin/rbac/policies', 'POST', 'Create Policy', 'Define a new access policy.', 'Admin', true),
('/api/admin/rbac/users/assign', 'POST', 'Assign Role', 'Assign a role to a specific user.', 'Admin', true),
('/api/admin/rbac/users/remove', 'POST', 'Remove Role', 'Remove a role assignment from a user.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: System Logs
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/system-logs', 'GET', 'Get System Logs', 'Retrieve system audit and error logs.', 'Admin', true),
('/api/admin/system-logs/stats', 'GET', 'Log Statistics', 'Get statistical summary of system logs.', 'Admin', true),
('/api/admin/system-logs/:id/resolve', 'PATCH', 'Resolve Log', 'Mark a log entry (error) as resolved.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: AI Agents
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/agents', 'GET', 'List Agents', 'Retrieve all AI agent configurations.', 'Admin', true),
('/api/admin/agents', 'POST', 'Create Agent', 'Create a new AI agent configuration.', 'Admin', true),
('/api/admin/agents/:id', 'PUT', 'Update Agent', 'Update agent configuration details.', 'Admin', true),
('/api/admin/agents/:id/status', 'PATCH', 'Toggle Agent Status', 'Activate or deactivate an AI agent.', 'Admin', true),
('/api/admin/agents/:id', 'DELETE', 'Delete Agent', 'Permanently delete an AI agent.', 'Admin', true),
('/api/admin/agents/:id/prompts', 'GET', 'Get Agent Prompts', 'Retrieve system prompts for an agent.', 'Admin', true),
('/api/admin/agents/:id/prompts', 'POST', 'Upsert Agent Prompts', 'Create or update system prompts for an agent.', 'Admin', true),
('/api/admin/agents/:id/prompts/:promptId', 'DELETE', 'Delete Agent Prompt', 'Remove a specific prompt from an agent.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: Skills
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/skills', 'GET', 'List Skills', 'Retrieve all available AI skills.', 'Admin', true),
('/api/admin/skills/upload', 'POST', 'Upload Skill', 'Upload and register a new skill package.', 'Admin', true),
('/api/admin/skills/:id/status', 'PATCH', 'Toggle Skill Status', 'Enable or disable a specific skill.', 'Admin', true),
('/api/admin/skills/:id', 'DELETE', 'Delete Skill', 'Remove a skill from the system.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: Integrations
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/integrations', 'GET', 'Get Integrations', 'Retrieve third-party integration configurations.', 'Admin', true),
('/api/admin/integrations', 'POST', 'Save Integration', 'Create or update an integration configuration.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: Product Categories
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/product-categories', 'GET', 'List Categories', 'Retrieve product categories.', 'Admin', true),
('/api/admin/product-categories', 'POST', 'Create Category', 'Create a new product category.', 'Admin', true),
('/api/admin/product-categories/:id', 'PUT', 'Update Category', 'Update category details.', 'Admin', true),
('/api/admin/product-categories/:id', 'DELETE', 'Delete Category', 'Delete a product category.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: Products
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/products', 'GET', 'List Products', 'Retrieve all products.', 'Admin', true),
('/api/admin/products', 'POST', 'Create Product', 'Create a new product entry.', 'Admin', true),
('/api/admin/products/:id', 'PUT', 'Update Product', 'Update product details.', 'Admin', true),
('/api/admin/products/:id', 'DELETE', 'Delete Product', 'Delete a product.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: Orders
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/orders/stats', 'GET', 'Order Stats', 'Get statistical summary of orders.', 'Admin', true),
('/api/admin/orders', 'GET', 'List Orders', 'Retrieve a paginated list of orders.', 'Admin', true),
('/api/admin/orders/:orderId/refunds', 'GET', 'Get Order Refunds', 'Retrieve refund history for a specific order.', 'Admin', true),
('/api/admin/orders/:orderId/refunds', 'POST', 'Create Refund', 'Initiate a refund for an order.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: Refunds
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/refunds', 'GET', 'List Refunds', 'Retrieve a list of all refunds.', 'Admin', true),
('/api/admin/refunds/stats', 'GET', 'Refund Stats', 'Get statistical summary of refunds.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Admin: Dashboard
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/admin/dashboard/overview', 'GET', 'Dashboard Overview', 'Get aggregated data for the admin dashboard.', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- AI: Chat & Debates
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/ai/chat/optimize', 'POST', 'Optimize Prompt', 'Optimize user prompt using LLM.', 'AI', true),
('/api/ai/chat', 'POST', 'Chat Completion', 'Send message to AI assistant.', 'AI', true),
('/api/ai/chat/skills', 'GET', 'List Chat Skills', 'Get available skills for the chat session.', 'AI', true),
('/api/ai/chat/history', 'DELETE', 'Clear History', 'Clear chat history for the current session.', 'AI', true),
('/api/ai/debates', 'GET', 'List Debates', 'Retrieve a list of AI debates.', 'AI', true),
('/api/ai/debates/:id', 'GET', 'Get Debate', 'Retrieve details of a specific debate.', 'AI', true),
('/api/ai/debates', 'POST', 'Start Debate', 'Start a new AI debate session.', 'AI', true),
('/api/ai/debates/:id/stop', 'POST', 'Stop Debate', 'Stop an active debate session.', 'AI', true)
ON CONFLICT (path, method) DO NOTHING;

-- Auth & System
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/auth/send-code', 'POST', 'Send Verification Code', 'Send login verification code via SMS/Email.', 'Auth', false),
('/api/auth/login-with-code', 'POST', 'Login with Code', 'Authenticate using verification code.', 'Auth', false),
('/api/auth/logout', 'POST', 'Logout', 'Invalidate current session.', 'Auth', true),
('/api/oauth/authorize', 'GET', 'OAuth Authorize', 'Initiate OAuth authorization flow.', 'Auth', false),
('/api/oauth/token', 'POST', 'OAuth Token', 'Exchange authorization code for access token.', 'Auth', false),
('/api/oauth/userinfo', 'GET', 'OAuth User Info', 'Get user profile using access token.', 'Auth', true),
('/api/v1/auth/check', 'GET', 'Check Auth Status', 'Check if current user is authenticated.', 'Auth', false),
('/api/v1/products', 'GET', 'Public Products', 'Get list of publicly available products.', 'Products', false),
('/api/ip', 'GET', 'Get IP Info', 'Get client IP information.', 'System', false)
ON CONFLICT (path, method) DO NOTHING;

-- Database
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/database/data', 'GET', 'Get Table Data', 'Retrieve raw data from database tables.', 'Database', true),
('/api/database/schema', 'GET', 'Get Schema', 'Retrieve database schema information.', 'Database', true),
('/api/database/tables', 'GET', 'List Tables', 'List all tables in the database.', 'Database', true)
ON CONFLICT (path, method) DO NOTHING;

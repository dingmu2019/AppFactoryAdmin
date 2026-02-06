
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend .env
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key. Check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const apiDefinitions = [
  // Admin: App Management
  { path: '/api/admin/apps', method: 'GET', summary: 'Get SaaS Apps', description: 'Retrieve a list of all registered SaaS applications.', category: 'Admin', auth_required: true },
  { path: '/api/admin/apps', method: 'POST', summary: 'Create SaaS App', description: 'Create a new SaaS application with API credentials.', category: 'Admin', auth_required: true },
  { path: '/api/admin/apps/:id', method: 'PUT', summary: 'Update SaaS App', description: 'Update application details and configuration.', category: 'Admin', auth_required: true },
  { path: '/api/admin/apps/:id', method: 'DELETE', summary: 'Delete SaaS App', description: 'Permanently delete a SaaS application.', category: 'Admin', auth_required: true },
  { path: '/api/admin/apps/:id/credentials', method: 'GET', summary: 'Get App Credentials', description: 'Retrieve API Key and Secret for an application.', category: 'Admin', auth_required: true },
  { path: '/api/admin/apps/:id/rotate-credentials', method: 'POST', summary: 'Rotate App Credentials', description: 'Regenerate API Key and Secret for an application.', category: 'Admin', auth_required: true },

  // Admin: API Catalog
  { path: '/api/admin/apis', method: 'GET', summary: 'List APIs', description: 'Retrieve the catalog of all system API definitions.', category: 'Admin', auth_required: true },
  { path: '/api/admin/apis/:id', method: 'GET', summary: 'Get API Details', description: 'Retrieve detailed information for a specific API endpoint.', category: 'Admin', auth_required: true },

  // Admin: Users
  { path: '/api/admin/users', method: 'GET', summary: 'List Users', description: 'Retrieve a paginated list of system users.', category: 'Admin', auth_required: true },
  { path: '/api/admin/users/:id', method: 'PUT', summary: 'Update User', description: 'Update user profile and roles.', category: 'Admin', auth_required: true },
  { path: '/api/admin/users/:id', method: 'DELETE', summary: 'Delete User', description: 'Soft delete or ban a user account.', category: 'Admin', auth_required: true },

  // Admin: RBAC
  { path: '/api/admin/rbac/roles', method: 'GET', summary: 'List Roles', description: 'Retrieve all defined RBAC roles.', category: 'Admin', auth_required: true },
  { path: '/api/admin/rbac/roles', method: 'POST', summary: 'Create Role', description: 'Define a new role with specific permissions.', category: 'Admin', auth_required: true },
  { path: '/api/admin/rbac/roles/:id', method: 'DELETE', summary: 'Delete Role', description: 'Remove a role definition.', category: 'Admin', auth_required: true },
  { path: '/api/admin/rbac/permissions', method: 'GET', summary: 'List Permissions', description: 'Retrieve all available system permissions.', category: 'Admin', auth_required: true },
  { path: '/api/admin/rbac/permissions', method: 'POST', summary: 'Create Permission', description: 'Define a new permission node.', category: 'Admin', auth_required: true },
  { path: '/api/admin/rbac/policies', method: 'GET', summary: 'List Policies', description: 'Retrieve access control policies.', category: 'Admin', auth_required: true },
  { path: '/api/admin/rbac/policies', method: 'POST', summary: 'Create Policy', description: 'Define a new access policy.', category: 'Admin', auth_required: true },
  { path: '/api/admin/rbac/users/assign', method: 'POST', summary: 'Assign Role', description: 'Assign a role to a specific user.', category: 'Admin', auth_required: true },
  { path: '/api/admin/rbac/users/remove', method: 'POST', summary: 'Remove Role', description: 'Remove a role assignment from a user.', category: 'Admin', auth_required: true },

  // Admin: System Logs
  { path: '/api/admin/system-logs', method: 'GET', summary: 'Get System Logs', description: 'Retrieve system audit and error logs.', category: 'Admin', auth_required: true },
  { path: '/api/admin/system-logs/stats', method: 'GET', summary: 'Log Statistics', description: 'Get statistical summary of system logs.', category: 'Admin', auth_required: true },
  { path: '/api/admin/system-logs/:id/resolve', method: 'PATCH', summary: 'Resolve Log', description: 'Mark a log entry (error) as resolved.', category: 'Admin', auth_required: true },

  // Admin: AI Agents
  { path: '/api/admin/agents', method: 'GET', summary: 'List Agents', description: 'Retrieve all AI agent configurations.', category: 'Admin', auth_required: true },
  { path: '/api/admin/agents', method: 'POST', summary: 'Create Agent', description: 'Create a new AI agent configuration.', category: 'Admin', auth_required: true },
  { path: '/api/admin/agents/:id', method: 'PUT', summary: 'Update Agent', description: 'Update agent configuration details.', category: 'Admin', auth_required: true },
  { path: '/api/admin/agents/:id/status', method: 'PATCH', summary: 'Toggle Agent Status', description: 'Activate or deactivate an AI agent.', category: 'Admin', auth_required: true },
  { path: '/api/admin/agents/:id', method: 'DELETE', summary: 'Delete Agent', description: 'Permanently delete an AI agent.', category: 'Admin', auth_required: true },
  { path: '/api/admin/agents/:id/prompts', method: 'GET', summary: 'Get Agent Prompts', description: 'Retrieve system prompts for an agent.', category: 'Admin', auth_required: true },
  { path: '/api/admin/agents/:id/prompts', method: 'POST', summary: 'Upsert Agent Prompts', description: 'Create or update system prompts for an agent.', category: 'Admin', auth_required: true },
  { path: '/api/admin/agents/:id/prompts/:promptId', method: 'DELETE', summary: 'Delete Agent Prompt', description: 'Remove a specific prompt from an agent.', category: 'Admin', auth_required: true },

  // Admin: Skills
  { path: '/api/admin/skills', method: 'GET', summary: 'List Skills', description: 'Retrieve all available AI skills.', category: 'Admin', auth_required: true },
  { path: '/api/admin/skills/upload', method: 'POST', summary: 'Upload Skill', description: 'Upload and register a new skill package.', category: 'Admin', auth_required: true },
  { path: '/api/admin/skills/:id/status', method: 'PATCH', summary: 'Toggle Skill Status', description: 'Enable or disable a specific skill.', category: 'Admin', auth_required: true },
  { path: '/api/admin/skills/:id', method: 'DELETE', summary: 'Delete Skill', description: 'Remove a skill from the system.', category: 'Admin', auth_required: true },

  // Admin: Integrations
  { path: '/api/admin/integrations', method: 'GET', summary: 'Get Integrations', description: 'Retrieve third-party integration configurations.', category: 'Admin', auth_required: true },
  { path: '/api/admin/integrations', method: 'POST', summary: 'Save Integration', description: 'Create or update an integration configuration.', category: 'Admin', auth_required: true },
  { path: '/api/admin/integrations/email/test', method: 'POST', summary: 'Test Email Sending', description: 'Send a test email to validate SMTP configuration.', category: 'Admin', auth_required: true },
  { path: '/api/admin/notifications', method: 'GET', summary: 'List Notification Channels', description: 'Get notification channels/providers/routes/templates overview.', category: 'Admin', auth_required: true },
  { path: '/api/admin/notifications/channels/:channelType', method: 'POST', summary: 'Upsert Notification Channel', description: 'Create or update a notification channel config, provider, route and template.', category: 'Admin', auth_required: true },
  { path: '/api/admin/notifications/test', method: 'POST', summary: 'Send Notification Test', description: 'Send a test message via notification channel routing.', category: 'Admin', auth_required: true },

  // Admin: Product Categories
  { path: '/api/admin/product-categories', method: 'GET', summary: 'List Categories', description: 'Retrieve product categories.', category: 'Admin', auth_required: true },
  { path: '/api/admin/product-categories', method: 'POST', summary: 'Create Category', description: 'Create a new product category.', category: 'Admin', auth_required: true },
  { path: '/api/admin/product-categories/:id', method: 'PUT', summary: 'Update Category', description: 'Update category details.', category: 'Admin', auth_required: true },
  { path: '/api/admin/product-categories/:id', method: 'DELETE', summary: 'Delete Category', description: 'Delete a product category.', category: 'Admin', auth_required: true },

  // Admin: Products
  { path: '/api/admin/products', method: 'GET', summary: 'List Products', description: 'Retrieve all products.', category: 'Admin', auth_required: true },
  { path: '/api/admin/products', method: 'POST', summary: 'Create Product', description: 'Create a new product entry.', category: 'Admin', auth_required: true },
  { path: '/api/admin/products/:id', method: 'PUT', summary: 'Update Product', description: 'Update product details.', category: 'Admin', auth_required: true },
  { path: '/api/admin/products/:id', method: 'DELETE', summary: 'Delete Product', description: 'Delete a product.', category: 'Admin', auth_required: true },

  // Admin: Orders
  { path: '/api/admin/orders/stats', method: 'GET', summary: 'Order Stats', description: 'Get statistical summary of orders.', category: 'Admin', auth_required: true },
  { path: '/api/admin/orders', method: 'GET', summary: 'List Orders', description: 'Retrieve a paginated list of orders.', category: 'Admin', auth_required: true },
  { path: '/api/admin/orders/:orderId/refunds', method: 'GET', summary: 'Get Order Refunds', description: 'Retrieve refund history for a specific order.', category: 'Admin', auth_required: true },
  { path: '/api/admin/orders/:orderId/refunds', method: 'POST', summary: 'Create Refund', description: 'Initiate a refund for an order.', category: 'Admin', auth_required: true },

  // Admin: Refunds
  { path: '/api/admin/refunds', method: 'GET', summary: 'List Refunds', description: 'Retrieve a list of all refunds.', category: 'Admin', auth_required: true },
  { path: '/api/admin/refunds/stats', method: 'GET', summary: 'Refund Stats', description: 'Get statistical summary of refunds.', category: 'Admin', auth_required: true },

  // Admin: Dashboard
  { path: '/api/admin/dashboard/overview', method: 'GET', summary: 'Dashboard Overview', description: 'Get aggregated data for the admin dashboard.', category: 'Admin', auth_required: true },

  // AI: Chat & Debates
  { path: '/api/ai/chat/optimize', method: 'POST', summary: 'Optimize Prompt', description: 'Optimize user prompt using LLM.', category: 'AI', auth_required: true },
  { path: '/api/ai/chat', method: 'POST', summary: 'Chat Completion', description: 'Send message to AI assistant.', category: 'AI', auth_required: true },
  { path: '/api/ai/chat/skills', method: 'GET', summary: 'List Chat Skills', description: 'Get available skills for the chat session.', category: 'AI', auth_required: true },
  { path: '/api/ai/chat/history', method: 'DELETE', summary: 'Clear History', description: 'Clear chat history for the current session.', category: 'AI', auth_required: true },
  { path: '/api/ai/debates', method: 'GET', summary: 'List Debates', description: 'Retrieve a list of AI debates.', category: 'AI', auth_required: true },
  { path: '/api/ai/debates/:id', method: 'GET', summary: 'Get Debate', description: 'Retrieve details of a specific debate.', category: 'AI', auth_required: true },
  { path: '/api/ai/debates', method: 'POST', summary: 'Start Debate', description: 'Start a new AI debate session.', category: 'AI', auth_required: true },
  { path: '/api/ai/debates/:id/stop', method: 'POST', summary: 'Stop Debate', description: 'Stop an active debate session.', category: 'AI', auth_required: true },

  // Auth & System
  { path: '/api/auth/send-code', method: 'POST', summary: 'Send Verification Code', description: 'Send login verification code via SMS/Email.', category: 'Auth', auth_required: false },
  { path: '/api/auth/login-with-code', method: 'POST', summary: 'Login with Code', description: 'Authenticate using verification code.', category: 'Auth', auth_required: false },
  { path: '/api/auth/logout', method: 'POST', summary: 'Logout', description: 'Invalidate current session.', category: 'Auth', auth_required: true },
  { path: '/api/oauth/authorize', method: 'GET', summary: 'OAuth Authorize', description: 'Initiate OAuth authorization flow.', category: 'Auth', auth_required: false },
  { path: '/api/oauth/token', method: 'POST', summary: 'OAuth Token', description: 'Exchange authorization code for access token.', category: 'Auth', auth_required: false },
  { path: '/api/oauth/userinfo', method: 'GET', summary: 'OAuth User Info', description: 'Get user profile using access token.', category: 'Auth', auth_required: true },
  { path: '/api/v1/auth/check', method: 'GET', summary: 'Check Auth Status', description: 'Check if current user is authenticated.', category: 'Auth', auth_required: false },
  { path: '/api/v1/products', method: 'GET', summary: 'Public Products', description: 'Get list of publicly available products.', category: 'Products', auth_required: false },
  { path: '/api/ip', method: 'GET', summary: 'Get IP Info', description: 'Get client IP information.', category: 'System', auth_required: false },

  // Database
  { path: '/api/database/data', method: 'GET', summary: 'Get Table Data', description: 'Retrieve raw data from database tables.', category: 'Database', auth_required: true },
  { path: '/api/database/schema', method: 'GET', summary: 'Get Schema', description: 'Retrieve database schema information.', category: 'Database', auth_required: true },
  { path: '/api/database/tables', method: 'GET', summary: 'List Tables', description: 'List all tables in the database.', category: 'Database', auth_required: true }
];

async function seed() {
  console.log('Seeding API Catalog...');
  
  const { error } = await supabase
    .from('sys_api_definitions')
    .upsert(apiDefinitions, { onConflict: 'path,method' });

  if (error) {
    console.error('Error seeding API catalog:', error);
    process.exit(1);
  }

  console.log('Successfully seeded API catalog!');
}

seed();

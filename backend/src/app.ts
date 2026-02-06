import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import aiChatRoute from './api/ai/chat/route.ts';
import aiDebatesRoute from './api/ai/debates.ts';
import aiLabRoute from './api/ai/lab.ts';
import databaseDataRoute from './api/database/data.ts';
import databaseSchemaRoute from './api/database/schema.ts';
import databaseTablesRoute from './api/database/tables.ts';
import databaseExportRoute from './api/database/export.ts';
import ipRoute from './api/ip/route.ts';
import auditRoute from './routes/audit.ts';
import authRoute from './api/auth/route.ts';
import oauthRoute from './api/oauth/route.ts';
import openApiV1Route from './api/v1/routes.ts';
import appMgmtRoute from './api/admin/app-mgmt.ts';
import apiCatalogRoute from './api/admin/api-catalog.ts';
import publicDocsRoute from './api/public/docs.ts';
import usersRoute from './api/admin/users.ts';
import rbacRoute from './api/admin/rbac.ts';
import systemLogsRoute from './api/admin/system-logs.ts';
import agentsRoute from './api/admin/agents.ts';
import skillsRoute from './api/admin/skills.ts';
import integrationsRoute from './api/admin/integrations.ts';
import notificationsRoute from './api/admin/notifications.ts';
import productCategoriesRoute from './api/admin/product-categories.ts';
import productsRoute from './api/admin/products.ts';
import ordersRoute from './api/admin/orders.ts';
import refundsRoute from './api/admin/refunds.ts';
import dashboardRoute from './api/admin/dashboard.ts';
import couponsRoute from './api/admin/coupons.ts';
import webhooksRoute from './api/admin/webhooks.ts';
import subscriptionsRoute from './api/admin/subscriptions.ts';
import debugRoute from './api/debug/route.ts';
import aiGatewayAdminRoute from './api/admin/ai-gateway.ts';
import promptsRoute from './api/admin/prompts.ts';
import cronRoute from './api/cron/route.ts';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.ts';
import { extractUser, autoAuditLogger } from './middleware/audit.ts';
import { globalErrorHandler } from './middleware/error.ts';
import { apiRateLimiter } from './middleware/rateLimit.ts';
import { requestLogger } from './middleware/requestLogger.ts';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger); // Structural Logging & Tracing

// Apply Rate Limiter Global or specific
// Applying globally to all API routes starting with /api/v1
app.use('/api/v1', apiRateLimiter);

// Middleware
app.use(extractUser);
app.use(autoAuditLogger);

// Routes
app.use('/api/v1', openApiV1Route); // Open API (External)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/cron', cronRoute);
app.use('/api/admin/apps', appMgmtRoute); // App Management (Internal)
app.use('/api/admin/apis', apiCatalogRoute); // API Catalog (Internal)
app.use('/api/admin/users', usersRoute); // User Management (Internal)
app.use('/api/admin/rbac', rbacRoute); // RBAC & Identity (Internal)
app.use('/api/admin/system-logs', systemLogsRoute); // System Logs (Internal)
app.use('/api/admin/agents', agentsRoute); // AI Agents (Internal)
app.use('/api/admin/skills', skillsRoute); // AI Skills (Internal)
app.use('/api/admin/integrations', integrationsRoute); // Integrations (Internal)
app.use('/api/admin/notifications', notificationsRoute); // Notification Channels (Internal)
app.use('/api/admin/product-categories', productCategoriesRoute); // Product Categories
app.use('/api/admin/products', productsRoute); // Products
app.use('/api/admin/orders', ordersRoute); // Orders
app.use('/api/admin/refunds', refundsRoute); // Refunds
app.use('/api/admin/dashboard', dashboardRoute); // Dashboard Overview
app.use('/api/admin/coupons', couponsRoute); // Coupons
app.use('/api/admin/subscriptions', subscriptionsRoute); // Subscriptions
app.use('/api/admin/webhooks', webhooksRoute); // Webhooks Management
app.use('/api/admin/ai-gateway', aiGatewayAdminRoute); // AI Gateway Admin
app.use('/api/admin/prompts', promptsRoute); // Programming Prompts
app.use('/api/audit-logs', auditRoute);
app.use('/api/auth', authRoute);
app.use('/api/oauth', oauthRoute);
app.use('/api/public', publicDocsRoute);
app.use('/api/ai/chat', aiChatRoute);
app.use('/api/ai/debates', aiDebatesRoute);
app.use('/api/ai/lab', aiLabRoute);
app.use('/api/database/data', databaseDataRoute);
app.use('/api/database/schema', databaseSchemaRoute);
app.use('/api/database/tables', databaseTablesRoute);
app.use('/api/database/export', databaseExportRoute);
app.use('/api/ip', ipRoute);
app.use('/api/debug', debugRoute); // Debug Routes

app.get('/', (req, res) => {
  res.send('AdminSys Backend API Running');
});

// Global Error Handler (Must be after all routes)
app.use(globalErrorHandler);

export default app;

# Features Overview

## 🤖 AI & Agents
- **Multi-Provider Support**: Integration with OpenAI and Google Gemini.
- **Agent Debates**: Dual-stream thinking (System 1/2), Reflexion Loop, and episodic memory for autonomous agent discussions.
- **AI Lab**: Experimental features for prompt engineering and model testing.
- **Environment Awareness**: Agents can search the codebase and access environment context.

## 💳 Payment & Billing
- **Multi-Channel Payment**:
  - **Stripe**: International credit card processing.
  - **Alipay**: Chinese market support.
  - **WeChat Pay**: Native WeChat integration.
  - **Lakala**: Enterprise payment aggregation.
- **Subscription Management**: Recurring billing, plan upgrades/downgrades.
- **Credits System**: Usage-based billing with credit consumption tracking.
- **Coupons & Discounts**: Flexible promotion engine.
- **Refund Handling**: Automated refund processing flows.

## 📧 Notifications & Communication
- **Email Service**: SMTP and provider-based email delivery (Nodemailer).
- **SMS Integration**: Alibaba Cloud SMS support.
- **Webhooks**: Event-driven notification system for external integrations.
- **Templating**: Dynamic message templates for emails and SMS.

## 🏢 SaaS Core
- **Multi-Tenancy**: Built-in support for multiple organizations/tenants.
- **Role-Based Access Control (RBAC)**: Granular permissions for Admins, Users, and specialized roles.
- **Audit Logging**: Comprehensive tracking of user actions and system events.
- **API Management**:
  - **SDK Generation**: Auto-generate client SDKs for external developers.
  - **API Sync**: Synchronization mechanisms for distributed systems.
  - **Rate Limiting**: Built-in metering and throttling.

## 🛠️ Developer Tools
- **Job Queue**: Robust background job processing using `pg-boss`.
- **Database Export**: Tools for data backup and migration.
- **Encryption**: Secure handling of sensitive data (API keys, secrets).
- **Scheduler**: Cron-based task scheduling (Vercel Cron compatible).

## 📊 Analytics & Dashboard
- **Real-time Monitoring**: System health and performance metrics.
- **Business Intelligence**: Revenue, user growth, and usage analytics charts (Recharts).

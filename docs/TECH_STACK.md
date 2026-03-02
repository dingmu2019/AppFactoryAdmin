# Technology Stack

## Core Frameworks
- **Frontend**: [Next.js 16.1.6](https://nextjs.org) (React 19, App Router, Turbopack)
- **Language**: [TypeScript 5](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) + [Radix UI](https://www.radix-ui.com) + [Lucide Icons](https://lucide.dev)
- **Database**: [PostgreSQL 15+](https://www.postgresql.org) via [Supabase](https://supabase.com)

## Backend Services
- **Auth**: Supabase Auth (OAuth, Email/Password)
- **Storage**: Supabase Storage
- **Queue**: [pg-boss](https://github.com/timgit/pg-boss) (Postgres-based job queue)
- **Redis**: [ioredis](https://github.com/luin/ioredis) (Caching, Rate Limiting)
- **Cron**: [node-cron](https://github.com/node-cron/node-cron) (Local), Vercel Cron (Production)

## AI & ML
- **LLM Providers**:
  - [OpenAI SDK](https://github.com/openai/openai-node)
  - [Google Generative AI](https://ai.google.dev)
- **Agent Framework**: Custom "Debate" engine with dual-stream thinking.
- **Tools**: [LangChain](https://js.langchain.com) concepts integrated.

## Payment & Billing
- **Stripe**: `@stripe/stripe-js`, `stripe` (Node.js)
- **Alipay**: `alipay-sdk`
- **WeChat Pay**: `wechatpay-node-v3`
- **Lakala**: Custom integration

## Utilities
- **Date/Time**: `date-fns`
- **Validation**: `zod` (implied/common practice), `ajv` (via rjsf)
- **Charts**: `recharts`
- **Markdown**: `react-markdown`, `remark-gfm`, `rehype-raw`
- **Diagrams**: `mermaid`
- **Sandboxing**: `isolated-vm` (Secure code execution)

## Dev & Build
- **Linter**: `eslint`
- **Bundler**: `turbopack` (Next.js default)
- **Deployment**: [Vercel](https://vercel.com) (Serverless Functions)

## Internationalization
- **i18n**: `i18next`, `react-i18next`, `i18next-browser-languagedetector`

# Vercel 部署评估报告 (AdminSys v0.23.0)

## 1. 项目概况
- **框架**: Next.js 16.1.6 (App Router)
- **版本**: 0.23.0
- **构建号**: 2026.03.02-stable
- **主要技术栈**: Supabase (Auth/DB), PostgreSQL, pg-boss (Queue), i18next (i18n), Tailwind CSS.

## 2. 部署兼容性评估

### 2.1 基础设施 (Compute)
- **评估**: 项目使用 Next.js App Router，完全符合 Vercel 的 Serverless Functions 部署模式。
- **注意事项**: 
  - Vercel 的 Serverless Function 有执行时长限制（免费版 10s，专业版 60s）。对于复杂的 AI 讨论生成等耗时操作，需确保在超时前返回响应或采用异步处理（Webhook）。

### 2.2 环境变量 (Environment Variables)
部署时必须在 Vercel 控制台配置以下关键变量：
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase API 地址。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 匿名 Key。
- `SUPABASE_SERVICE_ROLE_KEY`: 用于管理员权限操作（如身份管理、API 审计）。
- `DATABASE_URL`: 用于直接连接 PostgreSQL (pg) 和队列管理 (pg-boss)。
- `ENCRYPTION_KEY`: 用于敏感配置的加密/解密。
- `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`: 驱动 AI 助手和实验室功能。
- `ALLOWED_ORIGINS`: 严格限制跨域访问。

### 2.3 任务调度与队列 (Cron & Queue)
- **问题**: 项目中使用了 `node-cron`，这在 Vercel Serverless 环境下**无法运行**（因为没有常驻进程）。
- **建议方案**:
  - **Cron**: 在 `vercel.json` 中配置 [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)，定期触发 API 路由（如 `/api/cron/*`）。
  - **Queue**: `pg-boss` 依赖常驻 worker。在 Serverless 环境下，建议通过外部 Trigger 或 Vercel Background Jobs（预览版）触发任务处理逻辑。

### 2.4 安全与中间件 (Security & Middleware)
- **风险**: 当前 `middleware.ts` 中的身份校验逻辑被注释掉了。
- **建议**: 在正式上线前，必须启用中间件校验，保护 `/api/admin/*` 等敏感路由。

## 3.1 排除冗余文件 (Excluding Redundant Files)
- **评估**: 根目录下存在 `AdminSys-001 his`（历史参考代码）和 `sdk`（独立子项目）文件夹。
- **操作**: 
  - 已在 `.vercelignore` 中添加排除规则，防止这些非生产代码进入 Vercel 构建环境，从而缩短部署时间并避免类型冲突。
  - 已在 `tsconfig.json` 中将这些目录加入 `exclude`，确保 `next build` 期间不会对这些文件进行类型检查。

## 3.2 待办事项 (Action Items)
1. **确认环境变量**:
   - 确保 `DATABASE_URL` 使用的是 Supabase 的 **Session Pooler (Port 6543)**，而 `DIRECT_URL` 使用的是 **Direct Connection (Port 5432)**。
2. **启用 Middleware**: 
   - 修复 Supabase Auth Helpers 的导入问题并启用鉴权。
3. **配置 Vercel Cron**:
   - 将 `node-cron` 的逻辑迁移至 Vercel Cron 触发器（已在 `vercel.json` 中预置）。
4. **数据库连接池**:
   - 生产环境建议使用连接池（如 Supabase 的 PgBouncer 或 Supavisor），防止 Serverless 实例过多导致数据库连接耗尽。

## 4. 结论
项目整体架构支持 Vercel 部署，但在**任务调度**和**中间件鉴权**方面需要针对 Serverless 环境进行特定调整。修复 `vercel.json` 后即可进行初步测试部署。

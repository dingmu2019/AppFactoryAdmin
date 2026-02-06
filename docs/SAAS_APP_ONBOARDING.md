# 新 SaaS 应用标准接入规范（AdminSys-001）

本文档用于指导“新 SaaS 应用”接入本统一后台系统，目标是让新应用能够复用：认证与权限、OpenAPI 安全网关、订单/支付/订阅、通知、Webhook、AI 网关等复利能力。

> 适用范围
> - 外部应用（你的 SaaS App）通过 OpenAPI 调用本系统（推荐路径）。
> - 内部管理端（统一后台）用于配置应用、查看日志、管理订单等。

---

## 0. 关键概念与边界

### 0.1 App（应用）与用户
- **App（应用）**：`saas_apps` 表中的一条记录。用于隔离产品、订单、Webhook、限流与配置等。
- **用户（User）**：统一用户池（Supabase auth），可在多个 App 下拥有关系（典型：同一个邮箱登录不同应用）。
- **调用方身份（Caller）**：
  - **OpenAPI 调用方**：用 `App Key/Secret` 进行签名鉴权（适合后端到后端、服务器调用）。
  - **后台管理用户**：通过后台登录 Token（Supabase JWT）访问 `/api/admin/*` 管理接口。

### 0.2 两套 API
- **Open API（对外）**：`/api/v1/*`。面向外部 SaaS App 服务器侧集成，使用签名鉴权。
- **Admin API（对内）**：`/api/admin/*`。面向后台管理端，使用登录态 + RBAC 权限控制。

---

## 1. 接入前置清单（必须）

### 1.1 数据库迁移已应用
确保 Supabase migrations 已全部应用（至少包含以下模块）：
- 多租户/订单基础：`11_b2c_architecture_upgrade.sql`
- 订单增强：`21_enhance_orders_for_saas.sql`
- OpenAPI 安全与调用日志：`26_api_security_and_logs.sql`
- 通知系统：`36_notification_channels.sql`、`52_message_templates.sql`
- Webhook 系统：`40_webhook_system.sql`（建议加上 `58_add_webhook_event_webhook_id.sql`）
- 支付与订阅：`36_add_payment_apis.sql`、`46_subscription_system.sql`
- AI 网关：`56_ai_gateway_system.sql`、`57_ai_gateway_quota_and_usage.sql`

### 1.2 环境变量（后端运行必须）
后端依赖的关键变量（至少）：
- `VITE_SUPABASE_URL` 或 `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`（仅服务端使用，严禁泄露到前端）
- `DATABASE_URL` / `DIRECT_URL`（如需要跑迁移脚本或直连 DB）

如部署在 Vercel 并启用 Cron：
- `CRON_SECRET`（用于校验 Vercel Cron 调用的授权头）

---

## 2. 创建新应用（App Onboarding）

### 2.1 创建 App 记录
在 `saas_apps` 中新增一条记录，至少包含：
- `id`：应用唯一 ID（推荐：`YourAppId_app` 形式）
- `name`：应用展示名称
- `app_key` / `app_secret`：OpenAPI 调用凭证（用于签名）
- `allowed_ips`：可选，限制可调用 OpenAPI 的 IP 白名单
- `config.rate_limit`：可选，配置默认限流

你可以参考已有的种子脚本：
- `supabase/migrations/99_add_initial_apps.sql`

> 重要说明
> - `app_secret` 属于最高敏感信息，必须仅保存在应用服务端，不得下发到浏览器或移动端。
> - 如需要“前端直连调用”，必须改为 OAuth2 用户 token 模式（不推荐直接暴露 App Secret）。

### 2.2 后台验证 App 是否可用
后台管理端应能在“应用列表”中看到新应用，并能打开详情页查看：
- app_id
- app_key（可显示部分）
- allowed_ips / rate_limit 配置

---

## 3. OpenAPI 鉴权规范（外部应用必须遵循）

### 3.1 请求头规范（必须）
OpenAPI 统一使用以下请求头（具体以服务端实现为准）：
- `x-app-key`：应用 Key
- `x-timestamp`：时间戳（毫秒/秒以服务端校验为准）
- `x-nonce`：随机串（防重放）
- `x-signature`：签名

> 示例：使用 curl 调用（示例中签名为伪代码，需按你的 SDK 计算）

```bash
# 中文说明：以下为 OpenAPI 调用示例；请在服务端计算 x-signature 后再发起请求
curl -X POST 'https://<your-domain>/api/v1/orders' \
  -H 'Content-Type: application/json' \
  -H 'x-app-key: <YOUR_APP_KEY>' \
  -H 'x-timestamp: <TIMESTAMP>' \
  -H 'x-nonce: <NONCE>' \
  -H 'x-signature: <SIGNATURE>' \
  -d '{"items":[{"productId":"xxx","quantity":1}]}' 
```

### 3.2 签名算法（建议）
建议统一采用：
- `HMAC-SHA256(app_secret, canonical_string)`
- `canonical_string` 由：method、path、timestamp、nonce、body_hash 等组成

具体实现以服务端为准（参考实现位置）：
- `backend/src/middleware/openapi/guard.ts`

### 3.3 错误响应（必须结构化）
OpenAPI 的错误响应应提供结构化字段（便于 SDK 复用）：
- `code`：错误码（机器可读）
- `message`：错误信息（人可读）
- `solution`：解决建议（可操作）

---

## 4. 功能模块接入（按需选择）

### 4.1 产品与库存（可选）
适用于电商/虚拟商品类 SaaS：
- 后台管理：`/api/admin/products`、`/api/admin/product-categories`
- 订单创建时会检查库存并扣减（RPC）：`decrement_stock` / `increment_stock`

相关位置：
- `backend/src/api/admin/products.ts`
- `supabase/migrations/37_inventory_functions.sql`

### 4.2 订单（推荐）
订单是多模块复用的枢纽（支付、退款、Webhook、通知都依赖它）。

相关位置：
- OpenAPI：`backend/src/api/v1/orders.ts`
- 服务层：`backend/src/services/OrderService.ts`
- 订单表结构：`supabase/migrations/11_b2c_architecture_upgrade.sql`

### 4.3 支付（按渠道启用）
对外支付入口（OpenAPI）：
- `backend/src/api/v1/payments.ts`

对内支付适配层：
- `backend/src/services/payment/PaymentService.ts`
- `backend/src/services/payment/adapters/StripeAdapter.ts`

> 中文说明：支付回调必须确保幂等（同一交易回调可能重复到达），建议以 `transaction_id` 做去重键。

### 4.4 订阅（按需）
适用于订阅制 SaaS：
- 表结构：`supabase/migrations/46_subscription_system.sql`
- API 入库：`supabase/migrations/47_add_subscription_apis.sql`

### 4.5 通知中心（强烈推荐）
当新应用需要“登录验证码、订单通知、失败告警”等，直接复用通知中心即可。

能力点：
- 多渠道（email/webhook 等）
- 模板（多语言）
- outbox 队列 + 重试（失败退避）

相关位置：
- 表结构与 RPC：`supabase/migrations/36_notification_channels.sql`
- 服务：`backend/src/services/notification/notificationService.ts`
- 后台配置：`backend/src/api/admin/notifications.ts`

### 4.6 Webhook（强烈推荐）
用于将关键事件推送回你的 SaaS 服务端（如订单已支付、退款成功、通知失败等）。

相关位置：
- 表结构：`supabase/migrations/40_webhook_system.sql`
- 事件与签名投递：`backend/src/services/WebhookService.ts`
- 管理 API：`backend/src/api/admin/webhooks.ts`
- OpenAPI：`backend/src/api/v1/webhooks.ts`

> 中文说明：建议应用 `58_add_webhook_event_webhook_id.sql`，让事件日志能稳定关联订阅配置，从而支持 cron 批量投递与重试。

### 4.7 AI 网关（按需）
当新应用需要统一接入 LLM（并具备策略、配额、用量统计）时，使用 AI 网关。

相关位置：
- OpenAPI：`backend/src/api/v1/ai.ts`
- 策略/日志：`supabase/migrations/56_ai_gateway_system.sql`
- 配额/用量：`supabase/migrations/57_ai_gateway_quota_and_usage.sql`
- 后台管理：`backend/src/api/admin/ai-gateway.ts`

---

## 5. 审计与日志（建议默认开启）

### 5.1 行为审计（写操作自动记录）
后端已对写请求自动记录审计日志（可复用到任何新模块）：
- 中间件：`backend/src/middleware/audit.ts`
- 服务：`backend/src/services/auditService.ts`

> 中文说明：如新模块新增了敏感字段，请在审计中做字段脱敏（已有 token/code 等脱敏逻辑）。

### 5.2 系统错误日志
后台提供系统日志查询与展示能力：
- `backend/src/api/admin/system-logs.ts`
- `backend/src/controllers/systemLogsController.ts`

---

## 6. Vercel 部署（可选）与 Cron 任务

### 6.1 Cron 触发与鉴权
如在 Vercel 上启用 Cron：
- 在 Vercel 环境变量中配置 `CRON_SECRET`
- Vercel 会自动用 `Authorization: Bearer <CRON_SECRET>` 触发任务
- 服务端会校验该 header（实现位于 `backend/src/api/cron/route.ts`）

### 6.2 Cron 任务入口
已提供统一入口（可批处理）：
- `/api/cron/run`：通知批处理、订单自动取消、Webhook 投递
- `/api/cron/daily-report`：每日技能报表（如技能运行在 Vercel 禁用，会返回 skipped）

---

## 7. 标准验收清单（新应用接入完成的定义）

- App 已创建：`saas_apps` 中存在记录，`app_key/app_secret` 已发放
- OpenAPI 可调用：签名校验通过，且可见 API 调用日志
- 订单（如启用）：可创建、查询、取消；库存（如启用）正确扣减与回滚
- 支付（如启用）：可创建支付单，回调幂等，订单状态正确更新
- 通知（如启用）：后台可配置渠道与模板；发送失败可重试；有日志可追溯
- Webhook（如启用）：可订阅事件，签名校验可通过，失败可重试
- 审计与错误日志：后台能查到关键操作与错误上下文


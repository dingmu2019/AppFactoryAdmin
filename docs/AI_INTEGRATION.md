# AI 编程工具集成指南 (AI-Ready Integration Guide)

本指南专为 AI 编程助手（如 Trae, Cursor, GitHub Copilot, ChatGPT 等）设计，旨在帮助 AI 快速理解本系统的 API 架构并自动生成高质量的集成代码。

## 1. 核心上下文 (AI Context)

- **API 定义文件**：[openapi.json](./openapi.json) (包含所有接口、Schema 和示例)。
- **基准地址 (Base URL)**：`http://localhost:3001/api/v1` (开发环境)。
- **租户模式**：多租户架构，所有请求必须包含 `x-app-key` 并在必要时包含签名。

## 2. 身份验证逻辑 (Authentication for AI)

AI 在生成客户端代码时，应遵循以下逻辑：

### A. 简单模式 (开发用)
直接在 Header 中添加：
- `x-app-key`: 子应用的 App Key
- `x-app-secret`: 子应用的 App Secret

### B. 安全模式 (生产用)
AI 应生成以下签名算法的代码：
1. **输入参数**：`Method`, `Path`, `Timestamp`, `Nonce`, `BodyString`, `AppSecret`。
2. **待签名字符串 (String To Sign)**：
   `StringToSign = Method + Path + Timestamp + Nonce + BodyString`
3. **签名算法**：使用 `HMAC-SHA256`。
   `Signature = HMAC_SHA256(AppSecret, StringToSign)`

**AI 提示词参考 (Prompt Example):**
> "根据 docs/openapi.json 中的定义，为我生成一个 TypeScript API 客户端。要求：包含 HMAC-SHA256 签名逻辑，签名 Header 为 x-signature，同时包含 x-app-key, x-timestamp 和 x-nonce。"

## 3. 业务逻辑语义提示 (Semantic Hints)

AI 工具在处理具体业务时应注意：

- **积分充值流**：
  1. 调用 `GET /products` 筛选 `type: 'credits'` 的产品。
  2. 调用 `POST /orders` 创建订单。
  3. 支付成功后，余额会自动反映在 `GET /auth/me` 的 `points` 字段中。
- **会员订阅流**：
  1. 调用 `GET /products` 筛选 `type: 'subscription'` 的产品。
  2. 支付成功后，权限会自动反映在 `GET /auth/me` 的 `vip_level` 字段中。
- **错误处理**：
  - `401 Unauthorized`：通常是签名错误或 `x-app-key` 失效。
  - `403 Forbidden`：通常是 IP 不在白名单中。

## 4. 数据模型映射 (Schema Mapping)

AI 可直接引用 [openapi.json](./openapi.json) 中的 `components/schemas`：
- `Product`：产品实体（含价格、类型、规格）。
- `Order`：订单实体（含状态、支付详情）。
- `UserProfile`：用户信息（含多租户隔离后的积分和等级）。

---

**注意**：本指南会随 [SaaS_API_GUIDE.md](./SaaS_API_GUIDE.md) 同步更新。建议将本目录添加到 AI 工具的“上下文”或“索引”中。

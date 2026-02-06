# API 管理与鉴权最佳实践方案

基于当前系统架构（Node.js + Supabase）及现有代码实现，我为您梳理了 SaaS 应用工厂 API 管理的最佳实践方案。

## 1. 核心鉴权机制 (Authentication)

目前系统已实现了基础的 API Key/Secret 生成和校验逻辑，建议在此基础上进行增强。

### 1.1 凭证体系
- **App ID (Client ID)**: 公开的唯一标识符，用于识别调用方。
- **App Secret (Client Secret)**: 仅在服务器端保存的密钥，用于签名请求。**严禁在前端代码或 URL 中暴露。**
- **Access Token (推荐新增)**: 为了减少 Secret 在网络传输中的风险，建议采用 `OAuth 2.0 Client Credentials` 模式。
    1.  应用使用 `App ID` + `App Secret` 换取短时效的 `Access Token` (如 2小时)。
    2.  后续 API 调用仅携带 `Access Token`。

### 1.2 签名认证 (Signature) - *当前方案的增强版*
如果不想引入 Access Token 的复杂性，可以完善现有的 Header 鉴权，增加签名机制防止重放攻击。
- **请求头**:
    - `X-App-Id`: 应用 ID
    - `X-Timestamp`: 当前时间戳 (用于防止重放，服务端校验偏差在 5 分钟内)
    - `X-Nonce`: 随机字符串 (防止重放)
    - `X-Signature`: 签名值 = `HMAC-SHA256(Method + URL + Timestamp + Nonce + Body, AppSecret)`

## 2. 安全策略 (Security)

### 2.1 密钥管理
- **存储安全**: 数据库中的 `api_secret` 建议加密存储（或仅存 Hash），但考虑到 SaaS 场景下用户可能需要查看/重置，可以使用可逆加密或仅在生成时显示一次（目前是明文存储）。
- **密钥轮换 (Rotation)**: 现有代码已支持 `rotateAppCredentials`，这是很好的实践。建议在轮换时支持“新旧共存”一段时间（如 24 小时），以免业务瞬间中断（需代码支持）。

### 2.2 访问控制
- **IP 白名单**: 允许用户在后台配置允许调用 API 的服务器 IP 地址。
- **HTTPS 强制**: 所有 API 调用必须通过 HTTPS。

## 3. 流量控制 (Rate Limiting)

现有数据库表 `saas_apps` 已有 `rate_limit` 字段，但中间件中尚未实现。
- **实现建议**: 使用 Redis 或内存（单机）实现滑动窗口限流。
- **响应头**: 返回 `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`。

## 4. 审计与监控 (Audit & Monitoring)

- **API 调用日志**: 记录每一次 API 调用的详细信息（App ID, Endpoint, Latency, Status Code, Client IP）。
- **用量统计**: 统计每日/每月的调用次数，用于计费或展示给用户。

## 5. 接口规范 (Open API Standard)

- **URL 规范**: `/api/v1/{resource}`
- **错误码**: 统一错误响应格式，如 `{ "code": "AUTH_FAILED", "message": "Invalid signature", "request_id": "..." }`
- **文档**: 自动生成 Swagger/OpenAPI 文档供开发者查阅。

---

## 实施路线图 (Implementation Plan)

如果您确认采纳上述方案，我将分步进行开发：

### 第一阶段：基础增强 (本次优先完成)
1.  **完善中间件**: 升级 `openApiGuard`，增加 `App ID` 校验（目前是用 API Key，建议统一术语），并增加简单的**签名校验逻辑**（可选，或先保持 Token 简单校验）。
2.  **完善 CRUD**: 确保前端应用管理页面能完整管理 App ID、Secret 和基本配置（已基本完成，需微调）。

### 第二阶段：安全与流控 (后续迭代)
1.  **IP 白名单**: 数据库添加字段，中间件增加校验。
2.  **限流**: 实现基于 `rate_limit` 字段的限流逻辑。
3.  **调用日志**: 创建 `api_logs` 表，异步记录调用情况。

**请确认：** 是否优先完善 **签名认证机制** 和 **API 日志记录**？这通常是 Open API 最核心的两个需求。
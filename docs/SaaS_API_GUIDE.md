# SaaS 工厂 API 架构与调用指南

## 1. 架构概览 (Architecture Overview)

本项目作为一个 **SaaS 工厂统一后台**，核心职责之一是向各个独立的 SaaS 子应用提供可复用的基础设施能力（如 AI 对话、支付、订单、邮件等）。为了实现这一目标，我们构建了一套自动化的 API 管理与鉴权体系。

### 核心组件
- **API 目录 (`sys_api_definitions`)**：集中存储所有可用接口的元数据和 Schema。
- **自动同步服务 (`ApiSyncService`)**：基于代码中的 JSDoc 自动更新 API 目录，确保文档与代码同步。
- **安全网关 (`openApiGuard`)**：负责多租户识别、IP 白名单校验、签名验证及流量控制。
- **管理 UI (`SysApiMgmtPage`)**：为管理员提供接口的可视化检索、详情查看及监控入口。

---

## 2. API 自动化维护 (Discovery & Sync)

我们采用 **“代码即文档”** 的理念，避免手动维护繁琐的文档。

### 如何注册新 API
1. **编写 JSDoc**：在后端路由文件（如 `backend/src/api/v1/*.ts`）中，为每个接口编写标准的 OpenAPI 注释。
   ```typescript
   /**
    * @openapi
    * /api/v1/ai/chat:
    *   post:
    *     tags: [AI]
    *     summary: 与 AI 进行对话
    *     security:
    *       - AppKeyAuth: []
    *     ...
    */
   ```
2. **触发同步**：
   - **自动**：系统启动时会自动调用 `ApiSyncService.sync()`。
   - **手动**：在管理后台“API 管理”页面点击“同步”按钮，或运行脚本 `npm run api-sync`。
3. **架构脚本**：项目内置了 [generate-api-docs.ts](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/scripts/generate-api-docs.ts)，它会深度扫描代码逻辑并自动填充参数结构。

---

## 3. SaaS 应用接入规范 (SaaS Client Call)

SaaS 子应用（租户）通过核心应用的 **V1 OpenAPI** 接口接入各项能力。

### 3.1 身份凭证
每个子应用在“应用管理”中创建后，将获得：
- **App Key (`x-app-key`)**：租户唯一标识。
- **App Secret**：用于签名的私钥，不可外泄。

### 3.2 鉴权模式
接口受 [guard.ts](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/backend/src/middleware/openapi/guard.ts) 保护，调用时必须在 Header 中携带鉴权信息。

#### 模式 A：签名验证 (推荐，生产环境)
通过对请求进行 HMAC-SHA256 签名，防止重放和篡改。
**Headers:**
- `x-app-key`: 应用 Key
- `x-timestamp`: 当前秒级时间戳 (5分钟内有效)
- `x-nonce`: 随机字符串
- `x-signature`: 计算得出的签名

**签名算法：**
`HMAC-SHA256(secret, Method + Path + Timestamp + Nonce + BodyString)`

#### 模式 B：简单密钥 (开发调试)
**Headers:**
- `x-app-key`: 应用 Key
- `x-app-secret`: 应用 Secret

---

## 4. 租户隔离与安全 (Security & Isolation)

- **租户注入**：通过鉴权后，系统会将 `currentApp` 注入 `req` 对象。
- **数据隔离**：所有业务逻辑必须根据 `req.currentApp.id` 进行数据过滤。
- **流量控制**：系统根据应用的 Plan 等级，通过 Redis 实现动态限流 (Rate Limiting)。
- **IP 白名单**：只有配置在应用设置中的 IP 地址才允许发起调用。

---

## 5. 监控与计费 (Metering)

每次 API 调用都会经过以下处理：
1. **审计日志**：记录在 `api_logs` 表中，包含响应时间、状态码等。
2. **计量统计**：调用 [MeteringService.recordUsage](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/backend/src/services/MeteringService.ts)，按调用次数或资源消耗计入账单。

---

## 6. 业务能力复用 (Business Capability Reuse)

子应用可以直接调用 V1 接口实现完整的业务闭环：

### 6.1 积分与订阅管理 (Credits & Subscriptions)
- **获取产品列表**：`GET /api/v1/products` (自动按租户隔离，返回该应用上架的积分包或订阅计划)。
- **创建订单**：`POST /api/v1/orders` (支持优惠券、库存校验)。
- **查询余额/状态**：`GET /api/v1/auth/me` (返回用户在当前应用下的 `points` 和 `vip_level`)。
- **订阅详情**：`GET /api/v1/subscriptions` (获取当前生效的订阅合约)。

### 6.2 自动化履约 (Fulfillment)
当用户支付成功后，[FulfillmentService](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/backend/src/services/FulfillmentService.ts) 会自动执行以下逻辑：
- **积分充值**：自动增加 `user_app_relations.points`。
- **订阅授权**：自动更新 `user_app_relations.vip_level` 并记录订阅有效期。
- **Webhook 通知**：向子应用配置的 Webhook 地址推送 `ORDER.FULFILLED` 消息。

### 6.3 售后与退款 (After-sales)
- **申请退款**：`POST /api/v1/refunds`。
- **自动收回**：退款审核通过后，系统会自动按比例收回已发放的积分或取消订阅权限。

---

## 7. 文档持续维护说明

本指南及系统内的 API 目录是动态生成的：
- **代码变动**：修改 API 逻辑或注释后，请运行 `npm run api-sync` 以更新数据库。
- **文档更新**：本 Markdown 文档应随架构调整手动维护，确保宏观逻辑的准确性。

> **提示**：完整的交互式文档可在管理后台通过 `Swagger UI` 访问：`/api/docs`。
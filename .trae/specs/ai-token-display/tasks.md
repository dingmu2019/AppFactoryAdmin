# Tasks

- [x] Task 1: 数据库迁移：添加 Token 统计字段
  - [x] 1.1: 创建一个新的迁移文件，在 `ai_chat_messages`, `debate_messages`, 和 `ai_lab_messages` 表中增加 `prompt_tokens` 和 `completion_tokens` 字段。
- [x] Task 2: 后端服务更新：捕获并保存 Token 数据
  - [x] 2.1: 更新 `src/services/ai/ModelRouter.ts` 中的 `generateResponse`（或类似方法），确保返回包含 `usage` 的完整响应。
  - [x] 2.2: 更新 `src/app/api/ai/chat/route.ts`，在保存 `ai_chat_messages` 时记录 Token。
  - [x] 2.3: 更新 `src/services/debate/debateService.ts`（或相关的 `generator.ts`），在保存 `debate_messages` 时记录 Token。
  - [x] 2.4: 更新 `src/app/api/ai/lab/[id]/messages/route.ts`（或类似路径），在保存 `ai_lab_messages` 时记录 Token。
- [x] Task 3: API 接口更新：透传 Token 数据
  - [x] 3.1: 更新 AI 对话、辩论和实验室的查询接口，在返回的消息 JSON 中包含 `prompt_tokens` 和 `completion_tokens`。
- [x] Task 4: 前端界面更新：显示 Token 统计
  - [x] 4.1: 修改 `src/components/chat/ChatMessage.tsx`（或类似组件），在 AI 消息下方显示 Token 数。
  - [x] 4.2: 修改 `src/components/debate/DebateMessage.tsx`（或类似组件），在智能体发言下方显示 Token 数。
  - [x] 4.3: 修改 AI 实验室的消息显示组件。

# Task Dependencies
- Task 2 依赖 Task 1 (需要数据库字段支持)
- Task 3 依赖 Task 2 (需要数据库中有数据才能返回)
- Task 4 依赖 Task 3 (需要 API 返回数据才能显示)

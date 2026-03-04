# AI 会话与辩论 Token 数量显示 Spec

## Why
目前系统在进行 AI 对话、智能体辩论以及 AI 实验室实验时，用户无法直观看到每次交互消耗的 Token 数量（输入与输出）。为了提高透明度，方便用户了解消耗情况及模型响应效率，需要在会话界面中实时显示这些数据。

## What Changes
- **数据库架构**: 
    - 在 `ai_chat_messages` 表中增加 `prompt_tokens` (INT) 和 `completion_tokens` (INT) 字段。
    - 在 `debate_messages` 表中增加 `prompt_tokens` (INT) 和 `completion_tokens` (INT) 字段。
    - 在 `ai_lab_messages` 表中增加 `prompt_tokens` (INT) 和 `completion_tokens` (INT) 字段。
- **后端逻辑**:
    - 更新 `ModelRouter` 服务，确保每次调用 AI 供应商（OpenAI, Gemini 等）后，将返回的 `usage` 信息透传给调用方。
    - 更新 `ChatService`、`DebateService` 和 `AiLabService`，在保存消息到数据库时，同步存入 `prompt_tokens` 和 `completion_tokens`。
    - 更新对应的 API 接口（`/api/ai/chat`, `/api/debate/*`, `/api/ai/lab/*`），在返回消息内容时包含 Token 统计数据。
- **前端界面**:
    - 修改 AI 对话消息组件，在消息底部显示“输入: X Token | 输出: Y Token”。
    - 修改智能体辩论发言组件，在每个智能体的发言下方显示 Token 消耗。
    - 修改 AI 实验室消息组件，同步显示 Token 消耗。

## Impact
- Affected specs: AI 会话管理、智能体辩论系统、AI 实验室
- Affected code:
    - `src/services/ai/ModelRouter.ts`
    - `src/app/api/ai/chat/route.ts`
    - `src/services/debate/debateService.ts`
    - `src/app/api/debate/[id]/messages/route.ts` (假设路径)
    - 前端消息渲染组件（如 `ChatMessage.tsx`, `DebateTurn.tsx`）

## ADDED Requirements
### Requirement: 实时 Token 统计显示
系统应在每次 AI 生成内容后，在界面上展示该次交互的 Token 消耗。

#### Scenario: AI 对话显示 Token
- **WHEN** 用户发送消息并收到 AI 回复
- **THEN** 在 AI 回复的消息卡片底部，应看到“Tokens: 输入 120, 输出 450”字样。

#### Scenario: 智能体辩论显示 Token
- **WHEN** 辩论中的某个智能体完成发言
- **THEN** 在该智能体的发言内容下方，应实时更新并显示本次发言消耗的 Token 数。

## MODIFIED Requirements
### Requirement: 消息存储完整性
- **WHEN** 系统持久化 AI 消息时
- **THEN** 必须同时保存 `prompt_tokens` 和 `completion_tokens` 字段，不能仅保存文本内容。

# Checklist

- [x] **数据库字段验证**: 确认 `ai_chat_messages`, `debate_messages`, 和 `ai_lab_messages` 表中存在 `prompt_tokens` 和 `completion_tokens` 字段。
- [x] **AI 对话 Token 统计验证**: 发送一条 AI 对话消息，并在 AI 回复后确认 `ai_chat_messages` 表中记录了正确的 Token 数。
- [x] **智能体辩论 Token 统计验证**: 开始一场辩论，确认 `debate_messages` 表中记录了每个智能体发言消耗的 Token 数。
- [x] **AI 实验室 Token 统计验证**: 在实验室中进行一次实验，确认 `ai_lab_messages` 表中记录了 Token 数。
- [x] **API 响应验证**: 调用消息查询接口，确认响应 JSON 中包含 `prompt_tokens` 和 `completion_tokens`。
- [x] **前端显示验证 (对话)**: 确认 AI 对话界面在每条 AI 消息下方清晰显示了 Token 消耗。
- [x] **前端显示验证 (辩论)**: 确认智能体辩论界面在每条发言下方清晰显示了 Token 消耗。
- [x] **前端显示验证 (实验室)**: 确认实验室界面在每条消息下方清晰显示了 Token 消耗。

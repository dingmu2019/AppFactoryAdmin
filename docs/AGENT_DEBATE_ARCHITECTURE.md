# 智能体讨论 (Agent Debate) 详细技术方案

## 1. 核心架构概述

智能体讨论系统采用 **多智能体协作 (Multi-Agent Collaboration)** 架构，通过模拟人类专家团队的辩论与决策过程，解决复杂问题。

系统引入了 **双流思维 (Dual-Stream Thinking)** 和 **反思闭环 (Reflexion Loop)** 机制，使智能体具备了“快思考”与“慢思考”的能力，并结合 **情景记忆 (Episodic Memory)** 实现知识的长期积累。

### 1.1 核心流程图

```mermaid
graph TD
    A[Start Debate] --> B{Retrieve Memory}
    B --> C[Inject Context]
    C --> D[Select Next Speaker]
    D --> E{High Entropy / Expert Role?}
    E -- Yes --> F[Reflexion Loop]
    E -- No --> G[Fast Generation]
    F --> H[Draft Response]
    H --> I[Self-Critique]
    I --> J[Revise & Finalize]
    G --> K[Direct Response]
    J --> L[Tool Execution (Optional)]
    K --> L
    L --> M[Save Message]
    M --> N{End Condition?}
    N -- No --> D
    N -- Yes --> O[Generate Summary]
    O --> P[Store to Memory]
    P --> Q[End]
```

## 2. 关键技术模块

### 2.1 双流思维 (Dual-Stream Thinking)

所有智能体的发言生成均包含两个部分，模仿人类的认知过程：

*   **Internal Monologue (System 2 - 慢思考)**:
    *   **功能**: 进行逻辑分析、规划论点、检索记忆、权衡利弊。
    *   **可见性**: 仅在后台记录，前端可选展示（"Thinking..." 状态）。
    *   **实现**: 在 Prompt 中强制要求输出 JSON 包含 `internal_monologue` 字段。
*   **Public Speech (System 1 - 快思考)**:
    *   **功能**: 面向公众的最终发言，精炼、有力、符合角色设定。
    *   **可见性**: 聊天窗口中显示的内容。

### 2.2 反思闭环 (Reflexion Loop)

为解决 LLM "一本正经胡说八道" 的问题，系统引入了自我修正机制。

*   **触发条件**:
    *   当前讨论熵值 (Entropy) > 0.7 (激烈/混乱状态)。
    *   角色为 "Architect" 或 "Expert" 等高智力设定。
*   **执行步骤**:
    1.  **Draft (起草)**: 生成初步回答。
    2.  **Self-Critique (自省)**: 智能体转换视角，自我审查草稿的逻辑漏洞、立场一致性及事实准确性。
    3.  **Revise (修订)**: 根据审查意见重新生成最终回答。

### 2.3 情景记忆 (Episodic Memory)

智能体不再是“健忘”的，能够从历史讨论中汲取经验。

*   **存储**: 每次讨论结束后，生成的 **Summary Report** 会作为一条记忆存入数据库。
*   **检索**:
    *   在生成发言前，系统通过 **关键字匹配 (Keyword Search)** (未来升级为 Vector Search) 检索与当前 Topic 相关的历史 Summary。
    *   检索到的 Insight 会被注入到 System Prompt 的 `[LONG-TERM MEMORY]` 区块中。
*   **效果**: 避免重复讨论已解决的问题，保持观点的一致性。

### 2.4 深度搜索 (Deep Search)

为了增强事实准确性，系统集成了工具调用能力。

*   **触发**: 高熵值环境下，System Prompt 会包含 `CRITICAL INSTRUCTION`，强制要求在发言前验证事实。
*   **工具**:
    *   `web_search`: 联网搜索最新信息。
    *   `search_codebase`: 检索项目代码库（环境感知）。
*   **环境感知**: 讨论开始时，自动注入当前数据库 Schema 快照，使智能体了解系统现状。

## 3. 后端实现细节

### 3.1 服务层 (Services)

*   **`DebateService`**:
    *   负责讨论的生命周期管理 (Create, Start, Stop, Recover)。
    *   维护 `activeDebates` 内存映射，处理并发循环。
*   **`DebateGenerator`**:
    *   **`generateAgents`**: 基于 Topic 动态生成角色画像 (Persona)。
    *   **`determineNextSpeaker`**: 基于上下文动态调度下一位发言者（LLM 决策）。
    *   **`generateAgentSpeech`**: 核心生成逻辑，包含 Reflexion Loop 和工具调用处理。
    *   **`generateCriticEvaluation`**: 定期触发“评论家”角色，进行第三方客观评估。
*   **`MemoryService`**:
    *   封装记忆检索逻辑 (`retrieveRelevantMemories`)。
*   **`DebateTools`**:
    *   封装 `executeTool` 逻辑，处理 Web Search 和 DB Schema 提取。

### 3.2 数据模型 (Database)

*   **`agent_debates`**:
    *   存储讨论元数据 (Topic, Mode, Entropy, Summary)。
    *   `participants`: JSONB 字段，存储参与者画像。
*   **`debate_messages`**:
    *   存储每一轮的对话内容。
    *   `internal_monologue`: 存储思维链内容。
    *   `is_summary_report`: 标记总结报告。

## 4. 前端交互体验

*   **实时流式传输**: 利用 Supabase Realtime 订阅 `debate_messages` 表，实现打字机效果。
*   **思维链展示**: 用户可点击查看智能体的 "Inner Thought"，增加透明度。
*   **总结报告**: 讨论结束后自动生成 Markdown 格式的精美总结报告，支持一键复制和 PDF 导出。
*   **分享机制**: 支持生成公开链接 (`/share/debate/:token`)，允许外部用户只读访问。

## 5. 未来演进规划

1.  **向量化记忆**: 引入 `pgvector`，实现基于语义的记忆检索，而非简单的关键词匹配。
2.  **多模态支持**: 允许智能体发送图表 (Mermaid) 或图片。
3.  **人类介入 (Human-in-the-loop)**: 允许人类用户在讨论过程中暂停并插入指令，引导讨论方向。

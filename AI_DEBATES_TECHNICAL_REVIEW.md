# 智能体讨论 (AI Debates) 功能与技术方案深度复盘 (v2.0)

## 1. 功能概述

“智能体讨论”是一个基于多智能体系统 (Multi-Agent System, MAS) 的高级决策辅助模块。它允许用户设定一个话题（Topic），系统会自动生成多个持有不同立场和角色的 AI 智能体（Agents），并让它们在一个模拟的虚拟空间中进行多轮次的即时辩论。

该功能的核心目标是模拟人类专家的集体决策过程，通过引入 **“系统 2 (System 2)”** 深度思考机制、**“主动环境感知”** 能力以及 **“工具增强辩证法”**，解决单一 LLM 回答复杂问题时视角单一、缺乏实证依据的问题。

---

## 2. 技术架构 (Technical Architecture)

系统采用典型的分层架构，数据流向如下：

`Frontend (React)` <-> `API Layer (Express)` <-> `DebateService` <-> `LLM Router` <-> `Tools (Search/Code)`

### 2.1 核心组件

| 组件 | 文件路径 | 职责 |
| :--- | :--- | :--- |
| **DebateService** | [debateService.ts](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/backend/src/services/debateService.ts) | 核心业务逻辑，包括智能体生成、回合控制、对抗性批评家、工具执行器。 |
| **API Routes** | [debates.ts](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/backend/src/api/ai/debates.ts) | 提供 HTTP 接口，处理前端的发起、查询、停止请求。 |
| **Database** | [07_agent_debate.sql](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/supabase/migrations/07_agent_debate.sql) | 存储辩论元数据 (`agent_debates`) 和消息历史 (`debate_messages`)。 |
| **Frontend Page** | [page.tsx](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/frontend/src/pages/apps/ai-assistant/debates/page.tsx) | 列表页、创建弹窗（支持自定义人数）、实时状态展示。 |
| **Detail Page** | [detail/page.tsx](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/frontend/src/pages/apps/ai-assistant/debates/detail/page.tsx) | 聊天室界面，支持 System 2 折叠展示和流式更新。 |

---

## 3. 关键技术实现 (Key Features)

### 3.1 智能体生成工厂 (Agent Factory)
系统基于 LLM 动态生成角色。
*   **逻辑**: 用户输入 `Topic`、`Entropy` (混乱度) 和 `Count` (人数) -> LLM 生成 JSON 数组。
*   **数据结构**: 每个 Agent 包含 `name`, `role` (如 "Supporter"), `stance` (立场), `avatar` (Emoji)。

### 3.2 系统 2 深度思考 (System 2 Thinking)
强制 Agent 在发言前进行“内心独白”。
*   **双流机制 (Dual-Stream)**: Prompt 要求模型返回 JSON：
    ```json
    {
      "internal_monologue": "分析局势，发现上一位发言者的逻辑漏洞...",
      "public_speech": "我不同意你的观点，因为..."
    }
    ```
*   **可视化**: 前端默认折叠 `internal_monologue`，点击展开可见黄色背景的思考过程。

### 3.3 主动环境感知 (Active Environment Perception)
解决 AI “纸上谈兵”的问题。
*   **Context Injection**: 实时读取 PostgreSQL `information_schema`，将真实的表结构（如 `users`, `orders`）注入 System Prompt。
*   **效果**: 智能体能准确引用当前系统字段，而非幻觉。

### 3.4 对抗性批评家 (The Adversarial Critic) `[NEW]`
解决“群体迷思”和“互夸”问题。
*   **角色**: 隐藏角色 **Hassabis (Critic)** (🕵️‍♂️)。
*   **机制**: 每隔 4 轮 (CRITIC_INTERVAL) 强制介入。
*   **行为**: 扫描最近 4 轮对话，检查逻辑谬误和事实错误，直接发表批评性言论进行纠偏。

### 3.5 工具增强辩证法 (Tool-Augmented Dialectic) `[NEW]`
打破“纯对话”限制，引入实证研究。
*   **协议**: Agent 可返回 `tool_call` 字段（如 `[TOOL: web_search "query"]`）。
*   **工具集**:
    1.  **search_codebase**: 查阅本地代码（如 `OrderService.ts`）。
    2.  **web_search**: 联网搜索。
*   **自适应适配器**:
    *   优先使用 `SERPAPI_KEY` (Google 搜索)。
    *   无 Key 时自动降级为 DuckDuckGo (Free API)。
*   **闭环**: 系统执行工具 -> 获取 Result -> 注入 LLM -> 生成最终发言。

---

## 4. 数据库设计 (Database Schema)

### `agent_debates` (主表)
*   `id`: UUID
*   `topic`: 讨论话题
*   `participants`: JSONB (存储 Agent 设定)
*   `status`: 'active' | 'completed' | 'paused'
*   `rounds_total`: 总轮次
*   `created_at`: 时间戳

### `debate_messages` (消息表)
*   `id`: UUID
*   `debate_id`: FK -> agent_debates
*   `agent_name`: 发言者姓名
*   `role`: 发言者角色
*   `content`: 发言内容 (包含 System 2 HTML 和 Tool Result)
*   `round_index`: 轮次索引

---

## 5. 总结

本项目已从一个简单的“多角色聊天室”进化为一个具备 **自我纠错** 和 **实证研究** 能力的智能决策系统。通过引入 **Hassabis 批评家** 和 **联网/代码搜索工具**，辩论不再是空对空的“头脑风暴”，而是能够产出经得起推敲的架构建议和技术方案。

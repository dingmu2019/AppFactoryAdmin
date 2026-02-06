-- -----------------------------------------------------------------------------
-- AI Lab Tables (Hassabis Upgrade)
-- -----------------------------------------------------------------------------
-- This migration adds tables for the "AI Lab" feature, enabling:
-- 1. Context-Aware Reusability (Factory Context)
-- 2. Blueprint Generation (Artifacts)
-- 3. Virtual Market Wargaming (Simulations)
-- -----------------------------------------------------------------------------

-- 1. AI Lab Sessions Table
-- Stores the high-level session state for different lab modes.
CREATE TABLE IF NOT EXISTS public.ai_lab_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('architect_blueprint', 'market_simulation', 'factory_optimization')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    
    -- Configuration for this specific lab session
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Context Awareness: Links to existing system capabilities (Snapshot)
    context_snapshot JSONB DEFAULT '{}'::jsonb,
    
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.ai_lab_sessions IS 'AI Lab 会话表：存储架构设计、市场模拟等高级智能体实验的会话状态';
COMMENT ON COLUMN public.ai_lab_sessions.id IS '会话唯一标识ID';
COMMENT ON COLUMN public.ai_lab_sessions.title IS '会话标题';
COMMENT ON COLUMN public.ai_lab_sessions.mode IS '实验模式：architect_blueprint (蓝图生成), market_simulation (市场博弈), factory_optimization (工厂优化)';
COMMENT ON COLUMN public.ai_lab_sessions.status IS '会话状态：active (进行中), completed (已完成), archived (已归档)';
COMMENT ON COLUMN public.ai_lab_sessions.config IS '会话配置参数 (JSON)';
COMMENT ON COLUMN public.ai_lab_sessions.context_snapshot IS '上下文快照：记录实验开始时系统的 API、数据库表结构等元数据，用于 Context-Aware 推理';
COMMENT ON COLUMN public.ai_lab_sessions.user_id IS '创建者用户ID';
COMMENT ON COLUMN public.ai_lab_sessions.created_at IS '创建时间';
COMMENT ON COLUMN public.ai_lab_sessions.updated_at IS '更新时间';

-- 2. AI Lab Messages Table
-- Stores the multi-agent conversation history within a lab session.
CREATE TABLE IF NOT EXISTS public.ai_lab_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.ai_lab_sessions(id) ON DELETE CASCADE,
    
    agent_name TEXT NOT NULL,
    agent_role TEXT NOT NULL, -- e.g., 'NeuralArchitect', 'GrowthHacker'
    
    -- Structured Content
    -- Unlike simple chat, Lab messages have internal thought process and public speech
    content JSONB NOT NULL, 
    -- Schema: { "thought": "Internal monologue...", "speech": "Public message...", "artifacts": [...] }
    
    round_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.ai_lab_messages IS 'AI Lab 消息表：存储智能体的结构化对话，包含思维链 (Thought) 和公开以 (Speech)';
COMMENT ON COLUMN public.ai_lab_messages.id IS '消息唯一标识ID';
COMMENT ON COLUMN public.ai_lab_messages.session_id IS '关联的会话ID';
COMMENT ON COLUMN public.ai_lab_messages.agent_name IS '智能体名称 (如: NeuralArchitect)';
COMMENT ON COLUMN public.ai_lab_messages.agent_role IS '智能体角色 (如: 架构师, 增长黑客)';
COMMENT ON COLUMN public.ai_lab_messages.content IS '消息内容结构体，包含 thought (思维链), speech (公开回复), artifacts (产出引用)';
COMMENT ON COLUMN public.ai_lab_messages.round_index IS '对话轮次序号';
COMMENT ON COLUMN public.ai_lab_messages.created_at IS '创建时间';

-- 3. AI Lab Artifacts Table
-- Stores the tangible outputs (Blueprints, Specs, Plans) generated during the session.
CREATE TABLE IF NOT EXISTS public.ai_lab_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.ai_lab_sessions(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL CHECK (type IN ('blueprint_json', 'api_spec', 'sql_schema', 'market_report', 'action_plan')),
    title TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- The actual content (e.g., the JSON blueprint, SQL script)
    content TEXT NOT NULL,
    
    -- Metadata (e.g., specific target tables, cost estimates)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.ai_lab_artifacts IS 'AI Lab 工件表：存储实验产出的高价值成果，如 AlphaCode 蓝图、SQL 脚本、API 规范';
COMMENT ON COLUMN public.ai_lab_artifacts.id IS '工件唯一标识ID';
COMMENT ON COLUMN public.ai_lab_artifacts.session_id IS '关联的会话ID';
COMMENT ON COLUMN public.ai_lab_artifacts.type IS '工件类型：blueprint_json (蓝图JSON), api_spec (API规范), sql_schema (SQL模式), market_report (市场报告), action_plan (行动计划)';
COMMENT ON COLUMN public.ai_lab_artifacts.title IS '工件标题';
COMMENT ON COLUMN public.ai_lab_artifacts.version IS '版本号 (默认1)';
COMMENT ON COLUMN public.ai_lab_artifacts.content IS '工件实际内容 (文本/JSON/SQL)';
COMMENT ON COLUMN public.ai_lab_artifacts.metadata IS '元数据 (JSON)';
COMMENT ON COLUMN public.ai_lab_artifacts.created_at IS '创建时间';

-- 4. RLS Policies
ALTER TABLE public.ai_lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_lab_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_lab_artifacts ENABLE ROW LEVEL SECURITY;

-- Policies for Sessions
CREATE POLICY "Users can view their own lab sessions" ON public.ai_lab_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lab sessions" ON public.ai_lab_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lab sessions" ON public.ai_lab_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lab sessions" ON public.ai_lab_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for Messages (Cascade via session_id is implicit for ownership check usually, but direct check is safer)
CREATE POLICY "Users can view messages of their sessions" ON public.ai_lab_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.ai_lab_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
    );

CREATE POLICY "System can insert messages" ON public.ai_lab_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.ai_lab_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
    );

-- Policies for Artifacts
CREATE POLICY "Users can view artifacts of their sessions" ON public.ai_lab_artifacts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.ai_lab_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
    );

CREATE POLICY "System can insert artifacts" ON public.ai_lab_artifacts
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.ai_lab_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
    );

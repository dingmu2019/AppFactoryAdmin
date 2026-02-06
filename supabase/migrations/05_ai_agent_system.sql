-- -----------------------------------------------------------------------------
-- AI Agent 系统 (AI Agent System)
-- -----------------------------------------------------------------------------

-- 1. AI Agents 表
-- 存储 Agent 的基础配置信息
CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 基础信息
    name VARCHAR(100) NOT NULL,          -- Agent 名称
    role VARCHAR(100),                   -- 角色/头衔 (如 "高级产品经理")
    avatar VARCHAR(255),                 -- 头像 (Emoji 或 URL)
    description TEXT,                    -- 功能描述
    
    -- 核心配置
    system_prompt TEXT NOT NULL,         -- 系统提示词 (核心设定)
    interaction_example JSONB,           -- 互动示例 (Few-Shot) [{"user": "...", "assistant": "..."}]
    
    -- 状态与权限
    is_active BOOLEAN DEFAULT TRUE,      -- 是否启用
    created_by UUID REFERENCES public.users(id), -- 创建者
    
    -- 元数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- 软删除时间
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_ai_agents_deleted_at ON ai_agents(deleted_at);

-- 添加注释
COMMENT ON TABLE ai_agents IS 'AI Agent 配置表';
COMMENT ON COLUMN ai_agents.name IS 'Agent 名称';
COMMENT ON COLUMN ai_agents.role IS '角色头衔';
COMMENT ON COLUMN ai_agents.system_prompt IS '核心系统提示词';
COMMENT ON COLUMN ai_agents.interaction_example IS 'Few-Shot 互动示例';

-- 2. 常用提示词表 (Common Prompts)
-- 存储每个 Agent 的快捷指令
CREATE TABLE IF NOT EXISTS agent_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    
    label VARCHAR(50) NOT NULL,          -- 提示词标题 (如 "优化需求")
    content TEXT NOT NULL,               -- 提示词内容
    
    usage_count INTEGER DEFAULT 0,       -- 使用次数统计
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE agent_prompts IS 'Agent 常用提示词库';

-- 3. RLS 策略

-- ai_agents 表权限
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

-- 所有认证用户可查看已启用的 Agent (用于业务模块使用)
CREATE POLICY "Users can view active agents" ON ai_agents
    FOR SELECT USING (is_active = true);

-- 管理员可查看所有 Agent (包括停用的)
CREATE POLICY "Admins can view all agents" ON ai_agents
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles))
    );

-- 仅管理员可增删改 Agent
CREATE POLICY "Admins can manage agents" ON ai_agents
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

-- agent_prompts 表权限
ALTER TABLE agent_prompts ENABLE ROW LEVEL SECURITY;

-- 继承 Agent 的可见性
CREATE POLICY "Users can view prompts of active agents" ON agent_prompts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM ai_agents WHERE id = agent_prompts.agent_id AND is_active = true)
    );

-- 管理员管理提示词
CREATE POLICY "Admins can manage prompts" ON agent_prompts
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

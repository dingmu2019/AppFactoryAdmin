-- -----------------------------------------------------------------------------
-- 智能体讨论与辩论系统 (Agent Debate System)
-- -----------------------------------------------------------------------------

-- 1. 辩论主表
CREATE TABLE IF NOT EXISTS agent_debates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 基础配置
    topic TEXT NOT NULL,                         -- 讨论话题
    mode VARCHAR(50) DEFAULT 'free_discussion',  -- 模式: free_discussion (自由讨论), debate (激烈辩论)
    duration_limit INTEGER DEFAULT 5,            -- 设定时长 (分钟)
    entropy FLOAT DEFAULT 0.5,                   -- 激烈程度/随机性 (0.0 - 1.0)
    
    -- 参与者 (存储生成的 Agent 信息 JSON)
    -- 格式: [{name: "A", role: "Supporter", stance: "...", avatar: "..."}]
    participants JSONB,
    
    -- 结果
    summary TEXT,                                -- 裁判总结报告 (Markdown)
    
    -- 状态与元数据
    status VARCHAR(50) DEFAULT 'pending',        -- pending, running, completed, terminated, error
    error_message TEXT,                          -- 错误信息记录
    
    user_id UUID REFERENCES public.users(id),    -- 发起用户
    app_id UUID,                                 -- 关联应用ID (可选)
    
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE          -- 软删除
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_agent_debates_user_id ON agent_debates(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_debates_status ON agent_debates(status);
CREATE INDEX IF NOT EXISTS idx_agent_debates_created_at ON agent_debates(created_at);

-- 添加注释
COMMENT ON TABLE agent_debates IS '智能体辩论记录表';
COMMENT ON COLUMN agent_debates.id IS '主键ID';
COMMENT ON COLUMN agent_debates.topic IS '讨论话题';
COMMENT ON COLUMN agent_debates.mode IS '模式: free_discussion(自由讨论), debate(激烈辩论)';
COMMENT ON COLUMN agent_debates.duration_limit IS '设定时长(分钟)';
COMMENT ON COLUMN agent_debates.entropy IS '对抗强度/随机性 (0.0 - 1.0)';
COMMENT ON COLUMN agent_debates.participants IS '参与的Agent列表 JSON';
COMMENT ON COLUMN agent_debates.summary IS '裁判总结报告(Markdown)';
COMMENT ON COLUMN agent_debates.status IS '状态: pending, running, completed, terminated, error';
COMMENT ON COLUMN agent_debates.error_message IS '错误信息记录';
COMMENT ON COLUMN agent_debates.user_id IS '发起用户ID';
COMMENT ON COLUMN agent_debates.app_id IS '关联应用ID';
COMMENT ON COLUMN agent_debates.started_at IS '开始时间';
COMMENT ON COLUMN agent_debates.ended_at IS '结束时间';
COMMENT ON COLUMN agent_debates.created_at IS '创建时间';
COMMENT ON COLUMN agent_debates.updated_at IS '更新时间';
COMMENT ON COLUMN agent_debates.deleted_at IS '软删除时间';

-- 2. 辩论消息表 (存储每条发言)
CREATE TABLE IF NOT EXISTS debate_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debate_id UUID REFERENCES agent_debates(id) ON DELETE CASCADE,
    
    agent_name VARCHAR(100) NOT NULL,            -- 发言 Agent 名称
    role VARCHAR(100),                           -- 角色
    content TEXT NOT NULL,                       -- 发言内容
    
    round_index INTEGER DEFAULT 0,               -- 发言轮次/序号
    is_summary BOOLEAN DEFAULT FALSE,            -- 是否为总结消息
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_debate_messages_debate_id ON debate_messages(debate_id);
CREATE INDEX IF NOT EXISTS idx_debate_messages_created_at ON debate_messages(created_at);

-- 添加注释
COMMENT ON TABLE debate_messages IS '辩论消息记录表';
COMMENT ON COLUMN debate_messages.id IS '主键ID';
COMMENT ON COLUMN debate_messages.debate_id IS '关联的辩论ID';
COMMENT ON COLUMN debate_messages.agent_name IS '发言Agent名称';
COMMENT ON COLUMN debate_messages.role IS 'Agent角色';
COMMENT ON COLUMN debate_messages.content IS '消息内容';
COMMENT ON COLUMN debate_messages.round_index IS '发言轮次/序号';
COMMENT ON COLUMN debate_messages.is_summary IS '是否为总结消息';
COMMENT ON COLUMN debate_messages.created_at IS '创建时间';

-- 3. 开启 Realtime (至关重要)
-- 允许前端订阅这两个表的变更
alter publication supabase_realtime add table agent_debates;
alter publication supabase_realtime add table debate_messages;

-- 4. RLS 策略
ALTER TABLE agent_debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;

-- 4.1 agent_debates 策略
-- 允许用户查看自己的辩论，或管理员查看所有
CREATE POLICY "Users can view own debates" ON agent_debates
    FOR SELECT USING (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles))
    );

-- 允许用户创建自己的辩论
CREATE POLICY "Users can insert own debates" ON agent_debates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 允许用户更新自己的辩论（或管理员）
CREATE POLICY "Users can update own debates" ON agent_debates
    FOR UPDATE USING (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles))
    );

-- 4.2 debate_messages 策略
-- 消息可见性继承自 debate
CREATE POLICY "Users can view messages of accessible debates" ON debate_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agent_debates 
            WHERE id = debate_messages.debate_id 
            AND (
                user_id = auth.uid() 
                OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles))
            )
        )
    );

-- 允许后端服务（Service Role）或触发器写入消息
-- 注意：如果使用 Supabase Client 在前端直接写入（不推荐），则需要额外策略
-- 这里我们假设主要通过后端 API 写入，或者允许用户写入（如果将来需要插嘴）
-- 目前简单起见，允许拥有 debate 写入权限的人写入消息
CREATE POLICY "Users can insert messages to own debates" ON debate_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agent_debates 
            WHERE id = debate_messages.debate_id 
            AND (
                user_id = auth.uid() 
                OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles))
            )
        )
    );

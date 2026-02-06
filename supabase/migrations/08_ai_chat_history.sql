-- -----------------------------------------------------------------------------
-- AI 聊天记录表 (AI Chat History)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- 关联到 public.users
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    feedback VARCHAR(20) CHECK (feedback IN ('like', 'dislike')), -- 用户反馈
    is_deleted BOOLEAN DEFAULT FALSE, -- 软删除标记 (用于普通用户删除)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE ai_chat_messages IS 'AI 助理对话历史记录';
COMMENT ON COLUMN ai_chat_messages.feedback IS '用户反馈: like(点赞), dislike(不认同)';
COMMENT ON COLUMN ai_chat_messages.is_deleted IS '软删除标记，true表示用户端不可见';

-- RLS 策略
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己未删除的消息
CREATE POLICY "Users can view own messages" ON ai_chat_messages
    FOR SELECT USING (
        auth.uid() = user_id AND (is_deleted = false OR is_deleted IS NULL)
    );

-- 用户可以插入自己的消息
CREATE POLICY "Users can insert own messages" ON ai_chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- 用户可以更新自己的消息 (例如反馈、软删除)
CREATE POLICY "Users can update own messages" ON ai_chat_messages
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- 管理员可以查看所有消息
CREATE POLICY "Admins can view all messages" ON ai_chat_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles))
    );

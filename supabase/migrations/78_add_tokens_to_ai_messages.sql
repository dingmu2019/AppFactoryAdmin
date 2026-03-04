-- 78_add_tokens_to_ai_messages.sql
-- 为 AI 消息和辩论记录添加 Token 统计字段

-- 1. AI 聊天记录表
ALTER TABLE IF EXISTS public.ai_chat_messages
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0;

COMMENT ON COLUMN public.ai_chat_messages.prompt_tokens IS '输入提示所消耗的 Token 数量';
COMMENT ON COLUMN public.ai_chat_messages.completion_tokens IS 'AI 回复所消耗的 Token 数量';

-- 2. 辩论消息表
ALTER TABLE IF EXISTS public.debate_messages
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0;

COMMENT ON COLUMN public.debate_messages.prompt_tokens IS '输入提示所消耗的 Token 数量';
COMMENT ON COLUMN public.debate_messages.completion_tokens IS 'AI 回复所消耗的 Token 数量';

-- 3. AI Lab 消息表
ALTER TABLE IF EXISTS public.ai_lab_messages
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0;

COMMENT ON COLUMN public.ai_lab_messages.prompt_tokens IS '输入提示所消耗的 Token 数量';
COMMENT ON COLUMN public.ai_lab_messages.completion_tokens IS 'AI 回复所消耗的 Token 数量';

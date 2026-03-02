-- 20260212000001_add_debate_scroll_mode.sql
-- 为 agent_debates 表添加 scroll_mode 字段，用于控制讨论页面的自动滚动行为

ALTER TABLE public.agent_debates
ADD COLUMN IF NOT EXISTS scroll_mode VARCHAR(20) DEFAULT 'auto';

-- 添加注释
COMMENT ON COLUMN public.agent_debates.scroll_mode IS '滚动模式: auto (跟随滚动), manual (手动滚动)';

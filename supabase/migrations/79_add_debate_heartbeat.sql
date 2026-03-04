-- 为智能体辩论表增加心跳时间字段，用于增强 Vercel 环境下的稳定性监控
-- Add heartbeat field to agent_debates for stability monitoring in Serverless environments

ALTER TABLE public.agent_debates ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN public.agent_debates.last_heartbeat_at IS '最后一次活跃心跳时间，用于判断后台进程是否存活';

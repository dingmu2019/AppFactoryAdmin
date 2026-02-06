-- Enable Soft Delete for AI Agents
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_ai_agents_deleted_at ON ai_agents(deleted_at);

-- Comment
COMMENT ON COLUMN ai_agents.deleted_at IS '软删除时间戳，非空表示已删除';

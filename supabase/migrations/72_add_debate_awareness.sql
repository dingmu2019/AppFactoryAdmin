-- Add enable_environment_awareness to agent_debates table
ALTER TABLE agent_debates 
ADD COLUMN IF NOT EXISTS enable_environment_awareness BOOLEAN DEFAULT false;

COMMENT ON COLUMN agent_debates.enable_environment_awareness IS 'Whether the debate participants have access to the active environment schema';

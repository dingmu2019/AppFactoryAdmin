-- Add share_token to agent_debates for public sharing
ALTER TABLE agent_debates ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

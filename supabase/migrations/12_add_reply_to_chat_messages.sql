-- Add reply_to column to ai_chat_messages
-- Used to link assistant responses to user messages for cascading operations (e.g. delete)

ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES ai_chat_messages(id) ON DELETE SET NULL;

COMMENT ON COLUMN ai_chat_messages.reply_to IS '关联的上一条消息ID (通常用于回复关联)';

-- Index for faster lookups when deleting/threading
CREATE INDEX IF NOT EXISTS idx_ai_chat_reply_to ON ai_chat_messages(reply_to);

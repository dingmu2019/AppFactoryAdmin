ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ai_chat_messages.attachments IS 'Message attachments (images, files) stored as JSON array: [{type, url, name, size}]';

-- 1) 为 webhook_events 增加 webhook_id，关联具体订阅（便于在无队列场景下通过 cron 拉取并投递）
ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS webhook_id UUID;

-- 2) 外键关联：事件日志绑定到订阅配置（webhooks）
ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_webhook_id_fkey
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE SET NULL;

-- 3) 关键字段注释（中文）
COMMENT ON COLUMN webhook_events.webhook_id IS '关联的 webhook 订阅 ID，用于定位 url/secret 并实现 cron 重试投递';

-- 4) 索引：提升 cron 扫描待投递队列效率
CREATE INDEX IF NOT EXISTS idx_webhook_events_due
  ON webhook_events(status, next_attempt_at, created_at);


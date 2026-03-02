
-- sys_webhooks: Tenant configured Webhook endpoints
CREATE TABLE IF NOT EXISTS sys_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id TEXT NOT NULL REFERENCES saas_apps(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- Used for HMAC signature
  events TEXT[] NOT NULL, -- Subscribed events, e.g., ['order.paid', 'user.signup']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- sys_webhook_events: Event delivery logs
CREATE TABLE IF NOT EXISTS sys_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES sys_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status INTEGER DEFAULT 0, -- HTTP status code, 0 means pending
  response_body TEXT,
  attempt_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookup of pending retries
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry ON sys_webhook_events(status, next_retry_at) WHERE status != 200;

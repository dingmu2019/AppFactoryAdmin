CREATE TABLE IF NOT EXISTS public.notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_type)
);

CREATE TABLE IF NOT EXISTS public.notification_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.notification_channels(id) ON DELETE CASCADE,
  provider_type VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.notification_channels(id) ON DELETE CASCADE,
  message_type VARCHAR(64) NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.notification_providers(id) ON DELETE RESTRICT,
  fallback_provider_id UUID REFERENCES public.notification_providers(id) ON DELETE SET NULL,
  priority INTEGER DEFAULT 100,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, message_type, priority)
);

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.notification_channels(id) ON DELETE CASCADE,
  message_type VARCHAR(64) NOT NULL,
  language VARCHAR(20) NOT NULL DEFAULT 'zh-CN',
  subject TEXT,
  body TEXT NOT NULL,
  format VARCHAR(16) NOT NULL DEFAULT 'text',
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, message_type, language)
);

CREATE TABLE IF NOT EXISTS public.notification_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.notification_channels(id) ON DELETE RESTRICT,
  message_type VARCHAR(64) NOT NULL,
  recipient TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  locked_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.notification_messages(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.notification_providers(id) ON DELETE SET NULL,
  status VARCHAR(16) NOT NULL,
  latency_ms INTEGER,
  response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_providers_channel_id ON public.notification_providers(channel_id);
CREATE INDEX IF NOT EXISTS idx_notification_routes_channel_message ON public.notification_routes(channel_id, message_type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel_message ON public.notification_templates(channel_id, message_type);
CREATE INDEX IF NOT EXISTS idx_notification_messages_status_retry ON public.notification_messages(status, next_retry_at, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_message_id ON public.notification_logs(message_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_notification_channels_modtime') THEN
    CREATE TRIGGER update_notification_channels_modtime
      BEFORE UPDATE ON public.notification_channels
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_notification_providers_modtime') THEN
    CREATE TRIGGER update_notification_providers_modtime
      BEFORE UPDATE ON public.notification_providers
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_notification_routes_modtime') THEN
    CREATE TRIGGER update_notification_routes_modtime
      BEFORE UPDATE ON public.notification_routes
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_notification_templates_modtime') THEN
    CREATE TRIGGER update_notification_templates_modtime
      BEFORE UPDATE ON public.notification_templates
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_notification_messages_modtime') THEN
    CREATE TRIGGER update_notification_messages_modtime
      BEFORE UPDATE ON public.notification_messages
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.claim_notification_jobs(batch_size INTEGER DEFAULT 20)
RETURNS SETOF public.notification_messages
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  now_ts TIMESTAMPTZ := NOW();
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id
    FROM public.notification_messages
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= now_ts)
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT batch_size
  ),
  updated AS (
    UPDATE public.notification_messages m
    SET status = 'processing',
        locked_at = now_ts,
        updated_at = now_ts
    WHERE m.id IN (SELECT id FROM picked)
    RETURNING m.*
  )
  SELECT * FROM updated;
END;
$$;

ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification channels" ON public.notification_channels
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

CREATE POLICY "Admins can manage notification providers" ON public.notification_providers
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

CREATE POLICY "Admins can manage notification routes" ON public.notification_routes
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

CREATE POLICY "Admins can manage notification templates" ON public.notification_templates
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

CREATE POLICY "Admins can manage notification messages" ON public.notification_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

CREATE POLICY "Admins can manage notification logs" ON public.notification_logs
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

INSERT INTO public.notification_channels (channel_type, name, is_enabled)
VALUES
  ('email', 'Email', true),
  ('sms', 'SMS', false),
  ('im', 'IM', false),
  ('whatsapp', 'WhatsApp', false)
ON CONFLICT (channel_type) DO NOTHING;

INSERT INTO public.notification_providers (channel_id, provider_type, name, config, is_enabled)
SELECT c.id, 'smtp', 'default', '{}'::jsonb, true
FROM public.notification_channels c
WHERE c.channel_type = 'email'
  AND NOT EXISTS (
    SELECT 1 FROM public.notification_providers p WHERE p.channel_id = c.id AND p.name = 'default'
  );

INSERT INTO public.notification_routes (channel_id, message_type, provider_id, priority, is_enabled)
SELECT c.id, 'login_verification', p.id, 100, true
FROM public.notification_channels c
JOIN public.notification_providers p ON p.channel_id = c.id AND p.name = 'default'
WHERE c.channel_type = 'email'
  AND NOT EXISTS (
    SELECT 1 FROM public.notification_routes r
    WHERE r.channel_id = c.id AND r.message_type = 'login_verification' AND r.priority = 100
  );

INSERT INTO public.notification_templates (channel_id, message_type, language, subject, body, format, is_enabled)
SELECT c.id, 'login_verification', 'zh-CN',
       '[AdminSys] 登录验证码 {{code}}',
       '<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">' ||
       '<h2 style="color:#111827;">登录验证码</h2>' ||
       '<p style="color:#374151;">验证码：<b style="font-size:22px;letter-spacing:6px;">{{code}}</b></p>' ||
       '<p style="color:#9CA3AF;font-size:12px;">有效期 {{ttlMinutes}} 分钟</p>' ||
       '</div>',
       'html',
       true
FROM public.notification_channels c
WHERE c.channel_type = 'email'
  AND NOT EXISTS (
    SELECT 1 FROM public.notification_templates t
    WHERE t.channel_id = c.id AND t.message_type = 'login_verification' AND t.language = 'zh-CN'
  );

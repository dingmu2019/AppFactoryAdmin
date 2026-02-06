
-- System Error Logs Schema

CREATE TABLE IF NOT EXISTS public.system_error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id VARCHAR(255) REFERENCES saas_apps(id) ON DELETE SET NULL, -- Optional: link to specific app
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warn', 'error', 'critical')),
    category VARCHAR(50) NOT NULL, -- e.g. 'payment', 'api', 'db', 'system'
    message TEXT NOT NULL,
    stack_trace TEXT,
    metadata JSONB DEFAULT '{}', -- Context like userId, request params
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying recent errors
CREATE INDEX IF NOT EXISTS idx_system_error_logs_created_at ON public.system_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_level ON public.system_error_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_app_id ON public.system_error_logs(app_id);

-- Add comments
COMMENT ON TABLE public.system_error_logs IS 'Centralized system error logs for monitoring and alerting';

-- RLS
ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Only Admins can view/manage system logs (Usually)
-- Apps might want to see their own errors?
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_error_logs'
      AND policyname = 'Admins can view all error logs'
  ) THEN
    CREATE POLICY "Admins can view all error logs" ON public.system_error_logs
        FOR SELECT
        USING (auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
        ));
  END IF;
END
$$;

-- Apps can view their own errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_error_logs'
      AND policyname = 'Apps can view own error logs'
  ) THEN
    CREATE POLICY "Apps can view own error logs" ON public.system_error_logs
        FOR SELECT
        USING (auth.uid() IN (SELECT owner_id FROM saas_apps WHERE id = system_error_logs.app_id));
  END IF;
END
$$;

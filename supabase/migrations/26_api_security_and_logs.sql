-- Add IP whitelist to saas_apps
ALTER TABLE public.saas_apps
ADD COLUMN IF NOT EXISTS allowed_ips TEXT; -- Comma separated IPs or CIDR

COMMENT ON COLUMN public.saas_apps.allowed_ips IS 'Comma-separated list of allowed IP addresses or CIDR blocks';

-- Create api_logs table
CREATE TABLE IF NOT EXISTS public.api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id VARCHAR(255) REFERENCES public.saas_apps(id) ON DELETE SET NULL,
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER,
    latency_ms INTEGER,
    client_ip VARCHAR(50),
    user_agent TEXT,
    request_id VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for api_logs
COMMENT ON TABLE public.api_logs IS 'Open API 调用日志表，用于审计和监控';
COMMENT ON COLUMN public.api_logs.id IS '日志唯一标识';
COMMENT ON COLUMN public.api_logs.app_id IS '调用方应用ID (关联 saas_apps)';
COMMENT ON COLUMN public.api_logs.method IS 'HTTP 请求方法 (GET, POST 等)';
COMMENT ON COLUMN public.api_logs.path IS '请求路径';
COMMENT ON COLUMN public.api_logs.status_code IS 'HTTP 响应状态码';
COMMENT ON COLUMN public.api_logs.latency_ms IS '请求处理耗时 (毫秒)';
COMMENT ON COLUMN public.api_logs.client_ip IS '客户端 IP 地址';
COMMENT ON COLUMN public.api_logs.user_agent IS '客户端 User-Agent';
COMMENT ON COLUMN public.api_logs.request_id IS '请求唯一追踪 ID';
COMMENT ON COLUMN public.api_logs.error_message IS '错误信息 (如有)';
COMMENT ON COLUMN public.api_logs.created_at IS '日志创建时间';

-- Add indexes for analysis
CREATE INDEX IF NOT EXISTS idx_api_logs_app_id ON public.api_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON public.api_logs(request_id);

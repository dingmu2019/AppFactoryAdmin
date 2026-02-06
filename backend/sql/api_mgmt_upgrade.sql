-- Upgrade saas_apps table to support API Management
-- 1. Add api_secret for server-to-server authentication
-- 2. Add is_active for quick disable
-- 3. Add allowed_origins for CORS/Security

ALTER TABLE saas_apps 
ADD COLUMN IF NOT EXISTS api_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS allowed_origins TEXT[],
ADD COLUMN IF NOT EXISTS rate_limit INT DEFAULT 1000; -- Requests per minute

-- Generate initial secrets for existing apps if null
UPDATE saas_apps 
SET api_secret = 'sk_' || encode(gen_random_bytes(24), 'hex') 
WHERE api_secret IS NULL;

-- Create index for faster API Key lookup
CREATE INDEX IF NOT EXISTS idx_saas_apps_api_key ON saas_apps(api_key);

-- Create API Access Logs table (separate from general audit logs for performance)
CREATE TABLE IF NOT EXISTS api_access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    app_id UUID REFERENCES saas_apps(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    latency_ms INT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_app_id ON api_access_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_access_logs(created_at);

-- Add Comments for API Management Objects (Compliance with Project Standards)
-- Comments for saas_apps new columns
COMMENT ON COLUMN saas_apps.api_secret IS '应用密钥 (Secret Key)，用于后端签名验证，严禁泄露给前端';
COMMENT ON COLUMN saas_apps.allowed_origins IS '允许的 CORS 域名列表，用于安全限制';
COMMENT ON COLUMN saas_apps.rate_limit IS 'API 速率限制 (每分钟请求数)';

-- Comments for api_access_logs table
COMMENT ON TABLE api_access_logs IS 'API 访问日志表，记录所有 Open API 的调用详情';
COMMENT ON COLUMN api_access_logs.id IS '日志唯一主键';
COMMENT ON COLUMN api_access_logs.app_id IS '调用 API 的应用 ID';
COMMENT ON COLUMN api_access_logs.endpoint IS '请求的 API 路径 (如 /api/v1/products)';
COMMENT ON COLUMN api_access_logs.method IS 'HTTP 请求方法 (GET, POST, etc.)';
COMMENT ON COLUMN api_access_logs.status_code IS 'HTTP 响应状态码';
COMMENT ON COLUMN api_access_logs.latency_ms IS '请求处理耗时 (毫秒)';
COMMENT ON COLUMN api_access_logs.ip_address IS '客户端 IP 地址';
COMMENT ON COLUMN api_access_logs.created_at IS '日志记录时间';

-- Comments for Indexes
COMMENT ON INDEX idx_saas_apps_api_key IS '用于加速 API Key 验证的唯一索引';
COMMENT ON INDEX idx_api_logs_app_id IS '用于按应用查询日志的索引';
COMMENT ON INDEX idx_api_logs_created_at IS '用于按时间范围查询日志的索引';


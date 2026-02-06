-- Upgrade audit_logs to support APP_ID
-- 1. Add app_id column to audit_logs
-- 2. Create error_logs table if not exists (although schema.sql has it, we ensure fields match)
-- 3. Add app_id to error_logs if missing

-- Add app_id to audit_logs
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES saas_apps(id);

COMMENT ON COLUMN audit_logs.app_id IS '关联的应用ID (APP_ID)，用于多应用隔离';

CREATE INDEX IF NOT EXISTS idx_audit_logs_app_id ON audit_logs(app_id);

-- Ensure error_logs table structure is correct and robust
CREATE TABLE IF NOT EXISTS system_error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level VARCHAR(20) DEFAULT 'ERROR', -- ERROR, WARN, FATAL
    message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB DEFAULT '{}', -- Request body, query params, etc.
    app_id UUID REFERENCES saas_apps(id),
    user_id UUID REFERENCES auth.users(id), -- If user is authenticated
    ip_address VARCHAR(45),
    path VARCHAR(255),
    method VARCHAR(10),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments for system_error_logs
COMMENT ON TABLE system_error_logs IS '系统错误日志表，记录后端运行时抛出的所有异常';
COMMENT ON COLUMN system_error_logs.level IS '错误级别 (ERROR, WARN, FATAL)';
COMMENT ON COLUMN system_error_logs.message IS '错误简述信息';
COMMENT ON COLUMN system_error_logs.stack_trace IS '完整的错误堆栈信息';
COMMENT ON COLUMN system_error_logs.context IS '上下文数据 (JSON)，包含请求参数、Body等';
COMMENT ON COLUMN system_error_logs.app_id IS '关联的应用ID';
COMMENT ON COLUMN system_error_logs.user_id IS '触发错误的用户ID (如有)';
COMMENT ON COLUMN system_error_logs.ip_address IS '客户端IP';
COMMENT ON COLUMN system_error_logs.path IS '请求路径';
COMMENT ON COLUMN system_error_logs.method IS '请求方法';
COMMENT ON COLUMN system_error_logs.resolved IS '错误是否已解决标记';

CREATE INDEX IF NOT EXISTS idx_error_logs_app_id ON system_error_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON system_error_logs(created_at);

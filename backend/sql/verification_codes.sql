-- Create verification_codes table for email login
-- Stores 8-character mixed case alphanumeric codes with expiration

CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_code ON verification_codes(email, code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

COMMENT ON TABLE verification_codes IS '邮箱登录验证码表';
COMMENT ON COLUMN verification_codes.email IS '接收邮箱';
COMMENT ON COLUMN verification_codes.code IS '8位验证码';
COMMENT ON COLUMN verification_codes.expires_at IS '过期时间';
COMMENT ON COLUMN verification_codes.is_used IS '是否已使用';

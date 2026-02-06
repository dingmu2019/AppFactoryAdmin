-- 52_message_templates.sql
-- Create message templates table for Unified Message Template Engine

CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL, -- Template Code: e.g. 'OTP_LOGIN', 'ORDER_PAID'
    channel VARCHAR(20) NOT NULL DEFAULT 'all', -- Channel: 'sms', 'email', 'whatsapp', 'feishu', 'all'
    name VARCHAR(100) NOT NULL, -- Internal Name: e.g. 'Login Verification Code'
    title VARCHAR(255), -- Subject/Title (Used for Email)
    content TEXT NOT NULL, -- Template Content with {placeholders}
    variables JSONB DEFAULT '[]'::jsonb, -- Expected variables list e.g. ["code", "name"]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(code, channel)
);

-- Comments
COMMENT ON TABLE message_templates IS 'Stores unified message templates for multi-channel distribution';
COMMENT ON COLUMN message_templates.code IS 'Unique business code for the template (e.g., OTP_LOGIN)';
COMMENT ON COLUMN message_templates.content IS 'Content string supporting {variable} substitution';

-- Seed Data: OTP Templates
INSERT INTO message_templates (code, channel, name, title, content, variables) VALUES 
(
    'OTP_LOGIN', 
    'sms', 
    'Login Verification (SMS)', 
    NULL, 
    '【SaaS Factory】Your verification code is {code}. Valid for 5 minutes.', 
    '["code"]'
),
(
    'OTP_LOGIN', 
    'email', 
    'Login Verification (Email)', 
    'Login Verification Code - {app_name}', 
    '<!DOCTYPE html>
<html>
<head>
    <style>
        .container { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; }
        .code { font-size: 24px; font-weight: bold; color: #4F46E5; letter-spacing: 2px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Login Verification</h2>
        <p>Hello,</p>
        <p>You are logging into <strong>{app_name}</strong>. Please use the following code to complete verification:</p>
        <div class="code">{code}</div>
        <p>This code is valid for 5 minutes. Do not share it with anyone.</p>
        <div class="footer">
            <p>If you did not request this, please ignore this email.</p>
            <p>&copy; {year} SaaS Factory. All rights reserved.</p>
        </div>
    </div>
</body>
</html>', 
    '["code", "app_name", "year"]'
)
ON CONFLICT (code, channel) DO NOTHING;

-- Seed Data: Welcome Template
INSERT INTO message_templates (code, channel, name, title, content, variables) VALUES 
(
    'WELCOME_USER',
    'all',
    'Welcome Message (Default)',
    'Welcome to {app_name}!',
    'Welcome {username}! We are glad to have you on board.',
    '["username", "app_name"]'
)
ON CONFLICT (code, channel) DO NOTHING;

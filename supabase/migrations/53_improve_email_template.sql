-- 53_improve_email_template.sql
-- Improve OTP_LOGIN email template for Global SaaS standards

-- Upsert the template with a better design
INSERT INTO message_templates (code, channel, name, title, content, variables) VALUES 
(
    'OTP_LOGIN', 
    'email', 
    'Login Verification (Global)', 
    'Your verification code for {app_name}', 
    '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Verification</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #333; line-height: 1.6; }
        .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .header { background: #4f46e5; padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; }
        .content { padding: 32px 24px; text-align: center; }
        .greeting { font-size: 16px; color: #374151; margin-bottom: 24px; }
        .code-box { background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 8px; padding: 16px; margin: 24px 0; display: inline-block; }
        .code { font-size: 32px; font-weight: 700; color: #111827; letter-spacing: 6px; font-family: "Courier New", monospace; }
        .expiry { font-size: 13px; color: #6b7280; margin-top: 16px; }
        .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        .footer a { color: #6b7280; text-decoration: underline; }
        @media (max-width: 600px) {
            .container { margin: 20px; width: auto; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{app_name}</h1>
        </div>
        <div class="content">
            <p class="greeting">Hello,</p>
            <p>Use the following code to complete your login verification:</p>
            
            <div class="code-box">
                <div class="code">{code}</div>
            </div>
            
            <p class="expiry">This code is valid for <strong>5 minutes</strong>.<br>Do not share it with anyone.</p>
        </div>
        <div class="footer">
            <p>If you did not request this email, please ignore it.</p>
            <p>&copy; {year} {app_name}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>', 
    '["code", "app_name", "year"]'
)
ON CONFLICT (code, channel) 
DO UPDATE SET 
    name = EXCLUDED.name,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    updated_at = NOW();

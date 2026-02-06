-- 20_add_daily_report_skill.sql

-- Insert the Daily Report Skill
-- Note: We assume the files are already placed in backend/uploads/skills/daily_report/
-- We need to generate a UUID for the skill.

INSERT INTO ai_skills (
    name,
    description,
    version,
    command,
    storage_path,
    is_active,
    manifest
) VALUES (
    'Daily System Report',
    'Daily email report of system stats (users, error logs)',
    '1.0.0',
    'daily-report',
    '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/backend/uploads/skills/daily_report', -- Absolute path is usually required by the current logic
    TRUE,
    '{
        "name": "Daily System Report",
        "version": "1.0.0",
        "description": "Daily email report of system stats (users, error logs)",
        "command": "daily-report",
        "entry": "index.js",
        "function": {
            "name": "daily_report_skill",
            "description": "Send daily system report via email",
            "parameters": {
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "Target email address"
                    }
                },
                "required": ["email"]
            }
        }
    }'::jsonb
);

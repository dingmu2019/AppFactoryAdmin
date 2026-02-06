-- Seed Demo High Value Skills
-- 1. SaaS Daily Pulse
INSERT INTO ai_skills (name, command, description, version, author, storage_path, manifest, is_active)
VALUES (
  'SaaS Daily Pulse',
  'saas_daily_pulse',
  'Generates a daily pulse report of the SaaS platform including new users, active agents, and chat volume.',
  '1.0.0',
  'System Architect',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/backend/skills/generate_saas_report',
  '{
    "name": "saas_daily_pulse",
    "command": "saas_daily_pulse",
    "description": "Generates a daily pulse report of the SaaS platform including new users, active agents, and chat volume.",
    "version": "1.0.0",
    "entry": "index.js",
    "function": {
      "name": "saas_daily_pulse",
      "description": "Generates a daily pulse report of the SaaS platform including new users, active agents, and chat volume.",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  }'::jsonb,
  true
)
ON CONFLICT (command) DO UPDATE SET
  storage_path = EXCLUDED.storage_path,
  manifest = EXCLUDED.manifest;

-- 2. System Health Check
INSERT INTO ai_skills (name, command, description, version, author, storage_path, manifest, is_active)
VALUES (
  'System Health Check',
  'system_health_check',
  'Checks the system health including database connectivity and recent error logs.',
  '1.0.0',
  'System Architect',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/backend/skills/system_health_check',
  '{
    "name": "system_health_check",
    "command": "system_health_check",
    "description": "Checks the system health including database connectivity and recent error logs.",
    "version": "1.0.0",
    "entry": "index.js",
    "function": {
      "name": "system_health_check",
      "description": "Checks the system health including database connectivity and recent error logs.",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  }'::jsonb,
  true
)
ON CONFLICT (command) DO UPDATE SET
  storage_path = EXCLUDED.storage_path,
  manifest = EXCLUDED.manifest;

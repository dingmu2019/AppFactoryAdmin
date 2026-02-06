-- 插入默认的 LLM 集成配置 (Placeholder)
-- 用户需要在系统界面中更新真实的 API Key

INSERT INTO integration_configs (category, config, is_enabled)
VALUES (
    'llm',
    '{
        "provider": "openai",
        "baseUrl": "https://api.openai.com/v1",
        "apiKey": "sk-placeholder-please-update-in-integration-settings",
        "model": "gpt-3.5-turbo"
    }'::jsonb,
    true
)
ON CONFLICT (category) DO NOTHING;

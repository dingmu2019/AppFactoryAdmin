-- 17_seed_llm_models.sql
-- Seed multiple LLM providers for the Model Router

-- 1. OpenAI GPT-4o (Primary)
INSERT INTO public.integration_configs (category, config, is_enabled)
VALUES (
    'llm',
    '{
        "provider": "openai",
        "model": "gpt-4o",
        "apiKey": "sk-proj-...", 
        "baseUrl": "https://api.openai.com/v1",
        "maxTokens": 4096,
        "temperature": 0.7
    }'::jsonb,
    true
);

-- 2. DeepSeek V3 (Cost-Effective Backup)
INSERT INTO public.integration_configs (category, config, is_enabled)
VALUES (
    'llm',
    '{
        "provider": "deepseek",
        "model": "deepseek-chat",
        "apiKey": "sk-...",
        "baseUrl": "https://api.deepseek.com/v1",
        "maxTokens": 4096,
        "temperature": 0.7
    }'::jsonb,
    true
);

-- 3. Qwen Max (Aliyun)
INSERT INTO public.integration_configs (category, config, is_enabled)
VALUES (
    'llm',
    '{
        "provider": "openai", 
        "model": "qwen-max",
        "apiKey": "sk-...",
        "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "maxTokens": 4096,
        "temperature": 0.7
    }'::jsonb,
    true
);

-- 4. Google Gemini 1.5 Pro (High Context)
INSERT INTO public.integration_configs (category, config, is_enabled)
VALUES (
    'llm',
    '{
        "provider": "google",
        "model": "gemini-1.5-pro",
        "apiKey": "AIza...",
        "maxTokens": 8192,
        "temperature": 0.7
    }'::jsonb,
    true
);

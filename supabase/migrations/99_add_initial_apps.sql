-- Insert AIGateway_app and Super_Sales_Agent_app
-- We use ON CONFLICT to avoid errors if they already exist

INSERT INTO public.saas_apps (id, name, description, status, api_key, slug, created_at, config)
VALUES
(
    'AIGateway_app', 
    'AI接入网关', 
    'Centralized AI Gateway for model routing and quota management', 
    'Active', 
    'sk_gateway_sys_' || substr(md5(random()::text), 1, 16), 
    'ai-gateway', 
    NOW(),
    '{"default_provider": "openai", "features": ["logging", "tracing"]}'::jsonb
),
(
    'Super_Sales_Agent_app', 
    '超级销售Agent', 
    'Advanced AI Sales Agent for customer engagement', 
    'Active', 
    'sk_sales_agent_' || substr(md5(random()::text), 1, 16), 
    'super-sales-agent', 
    NOW(),
    '{"agent_mode": "proactive", "knowledge_base": "sales_v1"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

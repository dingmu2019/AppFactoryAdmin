-- -----------------------------------------------------------------------------
-- 集成配置模块 (Integration Configs)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS integration_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL UNIQUE, -- llm, email, database, wechat, enterprise
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- 存储具体配置字段
    is_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE integration_configs IS '集成配置表：存储系统与外部服务的集成参数';
COMMENT ON COLUMN integration_configs.category IS '集成类别：llm, email, database, wechat, enterprise';
COMMENT ON COLUMN integration_configs.config IS '配置详情 (JSONB): 包含API Key, Endpoint等敏感信息';
COMMENT ON COLUMN integration_configs.is_enabled IS '是否启用';

-- 启用 RLS
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

-- 仅允许管理员管理
CREATE POLICY "Admins can manage integrations" ON integration_configs
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

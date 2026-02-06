-- 16_llm_config_enhancement.sql
-- 移除 category 上的唯一约束，允许为同一类别配置多个提供商 (如: llm 类别下配置 OpenAI, Gemini, Claude)
ALTER TABLE public.integration_configs DROP CONSTRAINT IF EXISTS integration_configs_category_key;

-- 添加索引以加速查询
CREATE INDEX IF NOT EXISTS idx_integration_configs_category ON public.integration_configs(category);

-- 确保旧数据兼容 (将唯一的 'llm' 记录保留)
-- 新增的记录将具有相同的 category='llm' 但不同的 config 内容 (provider, priority 等)

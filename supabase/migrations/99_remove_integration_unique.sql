-- 移除 integration_configs 表中 category 字段的唯一约束，以支持同一类别（如 llm）有多条配置记录
ALTER TABLE integration_configs DROP CONSTRAINT IF EXISTS integration_configs_category_key;

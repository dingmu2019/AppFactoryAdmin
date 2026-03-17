-- 100_allow_multiple_payment_providers.sql
-- 彻底移除 integration_configs 表中限制同一类别（如 payment, llm）只能有一条记录的唯一索引/约束

-- 1. 尝试移除各种已知的唯一索引和约束
DROP INDEX IF EXISTS idx_integration_configs_category_active;
DROP INDEX IF EXISTS idx_integration_configs_category_singleton;
ALTER TABLE integration_configs DROP CONSTRAINT IF EXISTS integration_configs_category_key;

-- 2. 如果存在 is_deleted 逻辑，我们可以创建一个支持多个活跃记录的索引（如果需要的话，但目前看支付需要多条记录）
-- 支付和 LLM 都需要支持同一 category 下有多条记录（通过 config 内的 provider/model 区分）

-- 移除所有对 category 的唯一性限制
-- 注意：如果业务上需要 LLM 的 model+provider 唯一，可以在那里单独加复合索引，但目前为了支付，我们先放开。

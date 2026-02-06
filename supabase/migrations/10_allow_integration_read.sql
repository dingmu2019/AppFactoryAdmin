-- 允许所有认证用户读取集成配置 (以便前端调用 AI)
-- 注意：这会暴露 API Key 给所有登录用户，仅适用于内部系统或开发环境
-- 生产环境建议通过 Edge Function 代理调用

CREATE POLICY "Authenticated users can view integrations" ON integration_configs
    FOR SELECT
    USING (auth.role() = 'authenticated');

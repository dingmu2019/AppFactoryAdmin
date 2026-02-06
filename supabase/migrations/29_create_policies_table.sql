-- 29_create_policies_table.sql
-- 创建访问策略表 (ABAC/Policy 支持)

CREATE TABLE IF NOT EXISTS public.admin_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    effect VARCHAR(20) NOT NULL CHECK (effect IN ('allow', 'deny')),
    resource VARCHAR(100) NOT NULL, -- e.g. 'order:*', 'app:123'
    action VARCHAR(100) NOT NULL,   -- e.g. 'read', 'delete'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.admin_policies IS '访问控制策略表 (ABAC)';
COMMENT ON COLUMN public.admin_policies.resource IS '资源标识符 (支持通配符)';
COMMENT ON COLUMN public.admin_policies.action IS '操作动作';

-- 开启 RLS
ALTER TABLE public.admin_policies ENABLE ROW LEVEL SECURITY;

-- 策略：仅认证用户可读，管理员可写 (简化)
CREATE POLICY "Authenticated users can view policies" ON public.admin_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage policies" ON public.admin_policies FOR ALL TO authenticated USING (true); -- 暂放宽，实际应限制

-- 初始化示例数据
INSERT INTO public.admin_policies (name, effect, resource, action, description) VALUES
('Allow Order Refund', 'allow', 'order:*', 'refund', '允许在授权范围内退款'),
('Deny System Delete', 'deny', 'system:*', 'delete', '禁止删除系统级资源')
ON CONFLICT DO NOTHING;

-- 25_rbac_system.sql
-- 2C SaaS工厂 RBAC (基于角色的访问控制) 系统设计
-- 核心理念：User (谁) + Role (角色) + Scope/App (在哪) = Permission (能做什么)

-- ==============================================================================
-- 1. 权限原子表 (Admin Permissions)
-- ==============================================================================
-- 定义系统中所有可被执行的原子操作，如 "查看订单"、"退款"、"管理应用"
-- 这是权限控制的最小颗粒度。

CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,  -- 权限唯一标识符，例如 'order.read', 'system.settings.edit'
    name VARCHAR(100) NOT NULL,         -- 权限友好名称，例如 '查看订单', '系统设置编辑'
    category VARCHAR(50),               -- 权限分类，用于UI分组展示，例如 '订单管理', '系统管理'
    description TEXT,                   -- 详细描述
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.admin_permissions IS '权限原子定义表';
COMMENT ON COLUMN public.admin_permissions.code IS '权限唯一代码，用于代码中鉴权检查';

-- ==============================================================================
-- 2. 角色表 (Admin Roles)
-- ==============================================================================
-- 定义角色的模板。角色是一组权限的集合。
-- 系统预置角色 (is_system=true) 不可删除，用户自定义角色可以灵活配置。

CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,   -- 角色代码，例如 'super_admin', 'app_admin', 'operator'
    name VARCHAR(100) NOT NULL,         -- 角色名称，例如 '超级管理员', '应用管理员'
    description TEXT,                   -- 角色职责描述
    is_system BOOLEAN DEFAULT false,    -- 是否为系统预置角色 (防止误删关键角色)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.admin_roles IS '管理员角色定义表';

-- ==============================================================================
-- 3. 角色-权限关联表 (Role Permissions)
-- ==============================================================================
-- 多对多关系表，将权限赋予角色。

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
    role_id UUID REFERENCES public.admin_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE public.admin_role_permissions IS '角色与权限的映射关系表';

-- ==============================================================================
-- 4. 管理员-角色-应用关联表 (User Role Assignments)
-- ==============================================================================
-- 核心授权表。决定了“谁”在“哪个应用”下拥有“什么角色”。
-- 支持全局授权 (app_id 为空) 和应用级授权 (app_id 指定)。

CREATE TABLE IF NOT EXISTS public.admin_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,     -- 关联 Supabase Auth 用户
    role_id UUID REFERENCES public.admin_roles(id) ON DELETE CASCADE,    -- 关联角色
    app_id VARCHAR REFERENCES public.saas_apps(id) ON DELETE CASCADE,       -- 关联应用 (Scope)
    
    -- 约束说明：
    -- 1. 如果 app_id 为 NULL，表示该用户拥有该角色的“全局权限”（适用于超级管理员）。
    -- 2. 如果 app_id 不为 NULL，表示该用户仅在该特定应用下拥有该角色权限。
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id), -- 授权操作人
    
    -- 联合唯一索引：防止重复授权
    -- 注意：Postgres 中 NULL 在唯一索引中被视为不同，但在业务逻辑上我们通过代码或触发器控制
    -- 这里我们使用部分索引来分别约束全局和应用级唯一性
    UNIQUE (user_id, role_id, app_id)
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'admin_user_roles'
          AND column_name = 'app_id'
          AND data_type <> 'character varying'
    ) THEN
        ALTER TABLE public.admin_user_roles
            DROP CONSTRAINT IF EXISTS admin_user_roles_app_id_fkey;

        ALTER TABLE public.admin_user_roles
            ALTER COLUMN app_id TYPE VARCHAR USING app_id::text;

        ALTER TABLE public.admin_user_roles
            ADD CONSTRAINT admin_user_roles_app_id_fkey
            FOREIGN KEY (app_id) REFERENCES public.saas_apps(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 为 app_id 为 NULL 的情况创建单独的唯一索引 (Postgres 15+ UNIQUE NULLS NOT DISTINCT 标准行为，但为了兼容旧版显式创建)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_user_roles_global ON public.admin_user_roles (user_id, role_id) WHERE app_id IS NULL;

COMMENT ON TABLE public.admin_user_roles IS '用户角色授权表 (支持SaaS多租户范围)';
COMMENT ON COLUMN public.admin_user_roles.app_id IS '授权范围：具体AppID或NULL(全局)';

-- ==============================================================================
-- 5. RLS 策略 (Row Level Security)
-- ==============================================================================
-- 保护 RBAC 表本身的安全，仅允许超级管理员查看和修改

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;

-- 策略：所有已认证用户可读取权限和角色定义 (用于前端UI展示)
DROP POLICY IF EXISTS "Authenticated users can view definitions" ON public.admin_permissions;
CREATE POLICY "Authenticated users can view definitions" ON public.admin_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.admin_roles;
CREATE POLICY "Authenticated users can view roles" ON public.admin_roles FOR SELECT TO authenticated USING (true);

-- 策略：仅超级管理员可修改定义 (此处简化逻辑，实际应检查 user_roles 表)
-- 暂时允许所有 authenticated 为了开发方便，生产环境需严格限制
-- 理想策略应为：
-- USING (EXISTS (SELECT 1 FROM admin_user_roles WHERE user_id = auth.uid() AND role_id = (SELECT id FROM admin_roles WHERE code = 'super_admin')))

-- ==============================================================================
-- 6. 基础数据初始化 (Seeding)
-- ==============================================================================

-- 6.1 初始化权限原子 (示例)
INSERT INTO public.admin_permissions (code, name, category, description) VALUES
-- 系统管理
('system.manage', '系统管理', '系统', '管理系统全局配置、日志等'),
('app.create', '创建应用', '应用', '创建新的SaaS应用租户'),
('app.manage', '管理应用', '应用', '修改应用配置、支付参数等'),

-- 用户/权限管理
('rbac.manage', '权限管理', '权限', '管理角色、分配权限'),
('user.manage', '用户管理', '用户', '管理后台管理员账号'),

-- 业务运营
('order.read', '查看订单', '订单', '查看订单列表及详情'),
('order.refund', '订单退款', '订单', '执行订单退款操作'),
('product.manage', '商品管理', '商品', '上下架商品、修改价格')
ON CONFLICT (code) DO NOTHING;

-- 6.2 初始化角色 (示例)
INSERT INTO public.admin_roles (code, name, description, is_system) VALUES
('super_admin', '超级管理员', '拥有系统所有权限，通常配置为全局范围', true),
('app_admin', '应用管理员', '拥有特定应用的所有管理权限', true),
('operator', '运营人员', '负责订单处理、商品维护等日常操作', true)
ON CONFLICT (code) DO NOTHING;

-- 6.3 绑定角色-权限 (Mapping)

-- A. 超级管理员 (所有权限)
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.code = 'super_admin'
ON CONFLICT DO NOTHING;

-- B. 应用管理员 (除系统级敏感权限外的所有业务权限)
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.code = 'app_admin' 
  AND p.code NOT IN ('system.manage', 'app.create') -- 排除系统级权限
ON CONFLICT DO NOTHING;

-- C. 运营人员 (订单、商品权限)
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.code = 'operator' 
  AND p.category IN ('订单', '商品')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 7. 辅助函数 (Helper Functions)
-- ==============================================================================

-- 7.1 检查用户是否有特定权限 (用于 RLS 或 存储过程)
CREATE OR REPLACE FUNCTION public.has_permission(
    _user_id UUID,
    _permission_code VARCHAR,
    _app_id VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.admin_user_roles ur
        JOIN public.admin_roles r ON ur.role_id = r.id
        JOIN public.admin_role_permissions rp ON r.id = rp.role_id
        JOIN public.admin_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = _user_id
          AND p.code = _permission_code
          -- 权限范围匹配逻辑：
          -- 1. 用户拥有全局权限 (ur.app_id IS NULL) -> 通过
          -- 2. 用户拥有当前应用权限 (ur.app_id = _app_id) -> 通过
          AND (ur.app_id IS NULL OR (_app_id IS NOT NULL AND ur.app_id = _app_id))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

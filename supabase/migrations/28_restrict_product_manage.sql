-- 28_restrict_product_manage.sql
-- 限制 'product.manage' 权限仅归属于 Super Admin
-- 回收其他角色 (App Admin, Operator) 的商品管理权限

-- 1. 从 admin_role_permissions 中删除非 super_admin 的 product.manage 权限映射
DELETE FROM public.admin_role_permissions
WHERE permission_id IN (
    SELECT id FROM public.admin_permissions WHERE code = 'product.manage'
)
AND role_id NOT IN (
    SELECT id FROM public.admin_roles WHERE code = 'super_admin'
);

-- 2. 确保 Super Admin 拥有此权限 (Idempotent)
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.code = 'super_admin' AND p.code = 'product.manage'
ON CONFLICT DO NOTHING;

-- 3. 添加 product.read 权限 (如果还没有)
INSERT INTO public.admin_permissions (code, name, category, description)
VALUES ('product.read', '查看商品', '商品', '查看商品列表和详情')
ON CONFLICT (code) DO NOTHING;

-- 4. 授予 product.read 给 App Admin 和 Operator (让他们至少能看)
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.code IN ('app_admin', 'operator') AND p.code = 'product.read'
ON CONFLICT DO NOTHING;

-- 5. 授予 product.read 给 Super Admin
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.code = 'super_admin' AND p.code = 'product.read'
ON CONFLICT DO NOTHING;

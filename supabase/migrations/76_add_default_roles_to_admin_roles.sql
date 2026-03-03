-- 76_add_default_roles_to_admin_roles.sql
-- 为 admin_roles 表补充基础内置角色，确保用户管理下拉列表完整性

-- 1. 插入基础内置角色
INSERT INTO public.admin_roles (code, name, description, is_system) VALUES
('ADMIN', '管理员', '系统管理员，拥有大部分管理权限', true),
('USER', '普通用户', '普通注册用户，仅拥有基础访问权限', true),
('EDITOR', '编辑', '内容编辑人员，可管理商品、文档等内容', true),
('VIEWER', '观察员', '仅读权限，可查看报表和数据但不能修改', true)
ON CONFLICT (code) DO NOTHING;

-- 2. 为 ADMIN 角色绑定常用权限 (示例)
-- 假设权限已在 25_rbac_system.sql 中定义
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.code = 'ADMIN' 
  AND p.code IN ('order.read', 'product.manage', 'app.manage')
ON CONFLICT DO NOTHING;

-- 3. 补充审计员角色 (之前在 i18n 中提到过)
INSERT INTO public.admin_roles (code, name, description, is_system) VALUES
('AUDITOR', '审计员', '负责查看系统审计日志与错误日志', true)
ON CONFLICT (code) DO NOTHING;

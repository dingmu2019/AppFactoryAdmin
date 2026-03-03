-- 76_add_default_roles_to_admin_roles.sql
-- 优化版：仅补充缺失的内置角色，保持小写命名风格以兼容现有数据

INSERT INTO public.admin_roles (code, name, description, is_system) VALUES
('user', '普通用户', '前端注册用户，仅拥有基础访问权限', true),
('editor', '编辑', '内容编辑人员，可管理商品和分类', true),
('viewer', '观察员', '仅读权限，可查看报表但不能修改', true)
ON CONFLICT (code) DO NOTHING;

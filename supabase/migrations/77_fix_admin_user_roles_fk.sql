-- 77_fix_admin_user_roles_fk.sql
-- 修复 PostgREST 无法识别 users 与 admin_user_roles 之间关系的问题
-- 原因：admin_user_roles.user_id 原本直接关联 auth.users(id)，
-- 但 API 查询是从 public.users 开始的，PostgREST 要求在同一个 Schema 下有直接的外键关联。

ALTER TABLE IF EXISTS public.admin_user_roles
    DROP CONSTRAINT IF EXISTS admin_user_roles_user_id_fkey;

ALTER TABLE IF EXISTS public.admin_user_roles
    ADD CONSTRAINT admin_user_roles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 补充说明：由于 public.users(id) 已经关联了 auth.users(id)，
-- 这种修改是安全的，且能让 Supabase 的自动关联查询（Join）正常工作。

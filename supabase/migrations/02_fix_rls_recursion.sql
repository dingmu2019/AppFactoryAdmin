-- 修复无限递归问题的迁移脚本
-- 问题描述：Integration Config 的 RLS 策略查询 public.users 表，而 public.users 表的 RLS 策略可能又查询自身（或间接导致），
-- 造成 "infinite recursion detected in policy for relation users" 错误。

-- 解决方案：
-- 1. 创建一个 SECURITY DEFINER 函数来检查管理员权限。该函数以拥有者权限运行，绕过 RLS。
-- 2. 修改 integration_configs 和 users 表的策略，使用该函数或直接检查 JWT metadata。

-- -----------------------------------------------------------------------------
-- 1. 创建 helper 函数 check_is_admin()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- 方法 A: 优先检查 JWT metadata (性能最好，无数据库查询)
    -- 注意：这要求用户登录时的 JWT 包含 role 信息
    IF (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- 方法 B: 如果 metadata 不可靠，则查询 public.users 表
    -- 使用 SECURITY DEFINER 上下文，避免触发 RLS 递归
    SELECT EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND 'admin' = ANY(roles)
    ) INTO is_admin;

    RETURN COALESCE(is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 2. 修复 public.users 表的 RLS 策略
-- -----------------------------------------------------------------------------
-- 删除可能导致递归的旧策略
DROP POLICY IF EXISTS "管理员可以查看所有资料" ON public.users;

-- 使用新函数重新定义策略
CREATE POLICY "管理员可以查看所有资料" ON public.users
    FOR SELECT USING (
        public.check_is_admin()
    );

-- -----------------------------------------------------------------------------
-- 3. 修复 integration_configs 表的 RLS 策略
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage integrations" ON integration_configs;

CREATE POLICY "Admins can manage integrations" ON integration_configs
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- -----------------------------------------------------------------------------
-- 4. 确保 error_logs 表允许写入 (如果之前有限制)
-- -----------------------------------------------------------------------------
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- 允许所有认证用户插入日志 (用于前端报错上报)
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON error_logs;
CREATE POLICY "Authenticated users can insert error logs" ON error_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 仅允许管理员查看日志
DROP POLICY IF EXISTS "Admins can view error logs" ON error_logs;
CREATE POLICY "Admins can view error logs" ON error_logs
    FOR SELECT TO authenticated
    USING (public.check_is_admin());

-- 修复产品表 RLS 策略，使用 check_is_admin() 避免递归并提高稳定性
-- 同时也允许管理员管理所有产品分类

-- 1. 修复 products 表策略
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 2. 修复 product_categories 表策略
DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;
CREATE POLICY "Admins can manage categories" ON public.product_categories
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 3. 确保 users 表查看策略也是用函数
DROP POLICY IF EXISTS "管理员可以查看所有资料" ON public.users;
CREATE POLICY "管理员可以查看所有资料" ON public.users
    FOR SELECT USING (public.check_is_admin());

-- 4. 如果 products 表还有其他限制策略，统一改为函数检查
DROP POLICY IF EXISTS "Users can view active products" ON public.products;
CREATE POLICY "Users can view active products" ON public.products
    FOR SELECT USING (status = 'active' OR public.check_is_admin());

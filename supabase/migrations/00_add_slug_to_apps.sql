
-- 00_add_slug_to_apps.sql
-- 补丁：为 saas_apps 表添加 slug 字段
-- 原因：后续的 seed 脚本依赖 slug 进行唯一性查找

ALTER TABLE public.saas_apps 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- 添加唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_apps_slug ON public.saas_apps(slug);

COMMENT ON COLUMN public.saas_apps.slug IS '应用唯一标识符 (URL友好)';

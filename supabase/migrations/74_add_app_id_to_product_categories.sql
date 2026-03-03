-- 74_add_app_id_to_product_categories.sql
-- 为产品分类表添加应用关联和父级分类支持

-- 1. 添加字段
-- 注意：saas_apps.id 是 VARCHAR 类型，所以此处 app_id 也要用 VARCHAR
ALTER TABLE public.product_categories 
ADD COLUMN IF NOT EXISTS app_id VARCHAR(100) REFERENCES public.saas_apps(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;

-- 2. 添加注释
COMMENT ON COLUMN public.product_categories.app_id IS '关联应用ID';
COMMENT ON COLUMN public.product_categories.parent_id IS '父级分类ID';

-- 3. 添加索引以优化查询
CREATE INDEX IF NOT EXISTS idx_product_categories_app_id ON public.product_categories(app_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON public.product_categories(parent_id);

-- -----------------------------------------------------------------------------
-- 商品及服务系统增强 (Product System Enhancement)
-- -----------------------------------------------------------------------------

-- 1. 产品分类表 (Product Categories)
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,          -- 分类名称
    code VARCHAR(50) UNIQUE NOT NULL,    -- 分类编码 (唯一标识)
    description TEXT,                    -- 描述
    sort_order INTEGER DEFAULT 0,        -- 排序权重
    is_active BOOLEAN DEFAULT TRUE,      -- 是否启用
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE product_categories IS '产品分类表';
COMMENT ON COLUMN product_categories.name IS '分类名称';
COMMENT ON COLUMN product_categories.code IS '分类编码';

-- 2. 增强现有产品表 (Products)
-- 添加分类关联和其他必要字段
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active', -- active, inactive, draft
ADD COLUMN IF NOT EXISTS images TEXT[], -- 图片URL数组
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 确保 sku 唯一
ALTER TABLE products ADD CONSTRAINT products_sku_unique UNIQUE (sku);

COMMENT ON COLUMN products.category_id IS '关联分类ID';
COMMENT ON COLUMN products.status IS '状态: active, inactive, draft';

-- 3. RLS 策略 (Row Level Security)

-- 分类表权限
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- 允许所有认证用户查看分类 (用于下拉选择)
CREATE POLICY "Users can view active categories" ON product_categories
    FOR SELECT USING (true);

-- 仅管理员可管理分类
CREATE POLICY "Admins can manage categories" ON product_categories
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

-- 产品表权限 (更新现有策略或添加新策略)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 允许所有认证用户查看上架商品
CREATE POLICY "Users can view active products" ON products
    FOR SELECT USING (status = 'active');

-- 管理员可管理所有商品
CREATE POLICY "Admins can manage products" ON products
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles)));

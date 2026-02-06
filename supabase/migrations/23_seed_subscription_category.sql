-- 23_seed_subscription_category.sql
-- 任务：
-- 1. 在商品分类中增加一条 "订阅软件" (SaaS Subscription) 的分类
-- 2. 将现有的唯一商品 "企业摇奖高级版 (2个月)" 关联到该分类

DO $$
DECLARE
    v_category_id UUID;
    v_product_id UUID;
BEGIN
    -- 1. 插入 "订阅软件" 分类
    INSERT INTO public.product_categories (name, code, description, sort_order, is_active)
    VALUES (
        '订阅软件', 
        'saas_subscription', 
        '各类 SaaS 软件订阅服务，包含按月、按年付费的高级权益。', 
        10, 
        true
    )
    ON CONFLICT (code) DO UPDATE 
    SET description = EXCLUDED.description
    RETURNING id INTO v_category_id;

    -- 确保获取 ID (处理 UPDATE 不返回 ID 的情况)
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id FROM public.product_categories WHERE code = 'saas_subscription';
    END IF;

    RAISE NOTICE 'Category ID (SaaS Subscription): %', v_category_id;

    -- 2. 获取目标商品 "企业摇奖高级版 (2个月)" 的 ID
    -- 通过 SKU 查找
    SELECT id INTO v_product_id FROM public.products WHERE sku = 'LOTTERY-PREM-2M';

    IF v_product_id IS NOT NULL THEN
        -- 3. 更新商品关联到新分类
        UPDATE public.products
        SET category_id = v_category_id,
            updated_at = NOW()
        WHERE id = v_product_id;
        
        RAISE NOTICE 'Updated product % to category %', v_product_id, v_category_id;
    ELSE
        RAISE NOTICE 'Product LOTTERY-PREM-2M not found, skipping association.';
    END IF;

END $$;

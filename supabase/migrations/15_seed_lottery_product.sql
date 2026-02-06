-- 15_seed_lottery_product.sql
-- 任务：添加“企业摇奖应用”及其高级版解锁商品
-- 需求：原价59元，优惠价39元，周期2个月，解锁无限人数和全模式

-- 1. 确保“企业摇奖应用”存在
-- 使用 DO block 来处理逻辑，避免变量作用域问题
DO $$
DECLARE
    v_app_id UUID;
    v_product_id UUID;
BEGIN
    -- 1.1 插入或获取 App ID
    -- 注意：先尝试通过 api_key 查找（作为唯一标识的替代方案），或者添加 slug 字段
    -- 这里假设已经执行了 00_add_slug_to_apps.sql 补丁
    
    -- 如果 slug 字段不存在，我们使用 api_key 作为唯一标识
    -- 为了稳健性，这里使用 name 进行查找，或者我们先确保 slug 字段存在
    
    INSERT INTO public.saas_apps (name, slug, description, status, api_key)
    VALUES (
        '企业摇奖应用', 
        'lottery-app', 
        '企业级年会活动抽奖神器，支持多种酷炫模式与万人同屏。', 
        'active',
        'app_lottery_v1' -- 临时的 API Key
    )
    ON CONFLICT (slug) DO UPDATE 
    SET description = EXCLUDED.description
    RETURNING id INTO v_app_id;

    -- 如果是 UPDATE，RETURNING 可能不返回 ID（取决于 Postgres 版本和具体情况），
    -- 所以再次查询确保获取 ID
    IF v_app_id IS NULL THEN
        SELECT id INTO v_app_id FROM public.saas_apps WHERE slug = 'lottery-app';
    END IF;

    RAISE NOTICE 'App ID: %', v_app_id;

    -- 2. 插入商品 (Product)
    -- 原价 59.00
    INSERT INTO public.products (
        app_id,
        name,
        sku,
        type,
        price,
        description,
        specs,
        status,
        images
    ) VALUES (
        v_app_id,
        '{"zh": "企业摇奖高级版 (2个月)", "en": "Lottery Premium (2 Months)"}'::jsonb,
        'LOTTERY-PREM-2M',
        'virtual', -- 虚拟商品/服务
        59.00,     -- 原价/划线价
        '购买后立即解锁企业摇奖全部高级权益：\n1. 突破5人限制，支持不限人数参与摇奖\n2. 解锁全部摇奖模式（含3D星球、相册抽奖、分组抽奖等）\n3. 权益有效期：2个月',
        '{
            "duration_days": 60,
            "period_label": "2个月",
            "rights": [
                {"code": "unlimited_users", "name": "不限参与人数", "limit": -1},
                {"code": "all_modes", "name": "全部摇奖模式", "limit": "all"}
            ],
            "free_limit": {
                "max_users": 5,
                "modes": ["simple"]
            }
        }'::jsonb,
        'active',
        ARRAY['https://placehold.co/600x400/indigo/white?text=Lottery+Premium'] -- 示例图片
    )
    ON CONFLICT (sku) DO UPDATE 
    SET 
        price = 59.00,
        specs = EXCLUDED.specs,
        description = EXCLUDED.description
    RETURNING id INTO v_product_id;

    -- 同样确保获取 Product ID
    IF v_product_id IS NULL THEN
        SELECT id INTO v_product_id FROM public.products WHERE sku = 'LOTTERY-PREM-2M';
    END IF;

    RAISE NOTICE 'Product ID: %', v_product_id;

    -- 3. 上架配置 (Product App Relation)
    -- 设置实际售卖价 (优惠价) 39.00
    INSERT INTO public.product_app_relations (
        product_id,
        app_id,
        sell_price,
        is_on_sale,
        app_tags,
        sort_order
    ) VALUES (
        v_product_id,
        v_app_id,
        39.00, -- 优惠价格
        true,
        ARRAY['限时特惠', '热销'],
        10
    )
    ON CONFLICT (product_id, app_id) DO UPDATE
    SET 
        sell_price = 39.00,
        is_on_sale = true,
        app_tags = ARRAY['限时特惠', '热销'];

    RAISE NOTICE 'Product seeded successfully for Lottery App.';

END $$;

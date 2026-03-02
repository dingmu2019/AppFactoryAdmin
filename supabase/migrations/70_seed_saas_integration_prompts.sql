
-- Migration to seed SaaS Integration prompts and category

-- 1. Ensure the SaaS Integration category exists
INSERT INTO public.prompt_categories (name, code, description, sort_order)
VALUES ('SaaS 集成', 'SAAS_INTEGRATION', '子 SaaS 应用调用核心应用 API 的相关集成提示词', 5)
ON CONFLICT (code) DO NOTHING;

-- 2. Insert Prompts
DO $$
DECLARE
    cat_id UUID;
BEGIN
    SELECT id INTO cat_id FROM public.prompt_categories WHERE code = 'SAAS_INTEGRATION';

    -- Prompt 1: API Client Generation
    INSERT INTO public.programming_prompts (title, original_content, optimized_content, tags, category_id)
    VALUES (
        '生成 SaaS API 客户端 (带 HMAC 签名)',
        '帮我写一个 TypeScript 的 API 客户端，调用地址是 http://localhost:3001/api/v1。要求：支持多租户鉴权，Header 必须包含 x-app-key, x-timestamp, x-nonce 和 x-signature。其中 x-signature 是 HMAC-SHA256 签名，待签名字符串是 Method + Path + Timestamp + Nonce + BodyString。',
        '# Role: Senior Integration Architect\n\n# Task: Generate a production-ready TypeScript API Client for SaaS Factory Integration.\n\n# Context:\n- Base URL: `http://localhost:3001/api/v1`\n- Security: Multi-tenant with HMAC-SHA256 signature verification.\n- Required Headers:\n  - `x-app-key`: Tenant identifier.\n  - `x-timestamp`: Current Unix timestamp in seconds.\n  - `x-nonce`: Random string.\n  - `x-signature`: HMAC-SHA256(Secret, Method + Path + Timestamp + Nonce + BodyString)\n\n# Code Requirements:\n1. Use `axios` or `fetch`.\n2. Implement a robust `sign` method.\n3. Include automatic header injection in interceptors.\n4. Provide example usage for `GET /products` and `POST /orders`.',
        ARRAY['TypeScript', 'HMAC', 'API', 'SaaS'],
        cat_id
    );

    -- Prompt 2: Subscription & Credits Flow
    INSERT INTO public.programming_prompts (title, original_content, optimized_content, tags, category_id)
    VALUES (
        '实现子应用积分/订阅业务流',
        '我想在我的子应用里实现积分购买和会员订阅的功能。请告诉我应该调用核心应用的哪些接口，以及支付成功后的逻辑。',
        '# Role: SaaS Product Developer\n\n# Task: Implement end-to-end Credits and Subscription flow using Core API.\n\n# Logic Flow:\n1. **Product Discovery**: Fetch available products from `GET /api/v1/products`. Filter by `type: "credits"` or `type: "subscription"`.\n2. **Order Creation**: Send `POST /api/v1/orders` with selected `productId` and `quantity`.\n3. **Payment Hook**: After payment, the core application automatically grants credits or VIP level to the user in `user_app_relations`.\n4. **Status Check**: Call `GET /api/v1/auth/me` to verify updated `points` or `vip_level`.\n\n# Instructions:\n- Explain how to map local user IDs to global core user IDs.\n- Describe the Webhook notification handling for `ORDER.FULFILLED` event.',
        ARRAY['Business Logic', 'Credits', 'Subscription', 'Workflow'],
        cat_id
    );

    -- Prompt 3: Integration Debugging
    INSERT INTO public.programming_prompts (title, original_content, optimized_content, tags, category_id)
    VALUES (
        '排查 API 鉴权与 RLS 错误',
        '我调用 API 报错了，要么是 401 Signature Error，要么是 403 Forbidden，帮我排查一下原因。',
        '# Role: API Troubleshooting Expert\n\n# Common Issues Checklist:\n1. **Signature Mismatch (401)**:\n   - Check if `x-timestamp` is within 5 minutes of server time.\n   - Ensure the `BodyString` is identical to what was sent (check for whitespace or JSON formatting differences).\n   - Verify `AppSecret` matches the `x-app-key` owner.\n2. **Forbidden (403)**:\n   - Verify if the client IP is added to the "IP Whitelist" in the App Settings.\n   - Check if the App has been disabled in the Admin Console.\n3. **Empty Results**:\n   - Ensure Row Level Security (RLS) is correctly scoped: the API automatically filters by `app_id`. Make sure you are looking for data belonging to the correct tenant.',
        ARRAY['Debugging', 'Security', 'Auth', 'Troubleshooting'],
        cat_id
    );

END $$;

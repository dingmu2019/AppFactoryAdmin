-- 修复 Trigger 函数：增加异常处理和类型转换的安全性
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role public.user_role := 'user';
    meta_role text;
    role_enum public.user_role;
    meta_gender text;
    gender_enum public.user_gender;
    app_id_uuid uuid;
BEGIN
    -- 1. 安全处理角色 (Role)
    meta_role := new.raw_user_meta_data->>'role';
    BEGIN
        role_enum := meta_role::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        role_enum := default_role;
    END;
    IF role_enum IS NULL THEN role_enum := default_role; END IF;

    -- 2. 安全处理性别 (Gender)
    meta_gender := new.raw_user_meta_data->>'gender';
    BEGIN
        gender_enum := meta_gender::public.user_gender;
    EXCEPTION WHEN OTHERS THEN
        gender_enum := 'unknown'::public.user_gender;
    END;
    IF gender_enum IS NULL THEN gender_enum := 'unknown'::public.user_gender; END IF;

    -- 3. 安全处理 App ID
    BEGIN
        -- 如果是空字符串或无效格式，设为 NULL
        IF (new.raw_user_meta_data->>'app_id') = '' THEN
            app_id_uuid := NULL;
        ELSE
            app_id_uuid := (new.raw_user_meta_data->>'app_id')::uuid;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        app_id_uuid := NULL;
    END;

    -- 4. 执行插入
    INSERT INTO public.users (id, email, full_name, avatar_url, roles, gender, phone_number, region, source_app_id)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url',
        ARRAY[role_enum]::public.user_role[],
        gender_enum,
        new.phone,
        (new.raw_user_meta_data->>'region')::jsonb,
        app_id_uuid
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 增加会话版本并更新用户元数据
CREATE OR REPLACE FUNCTION public.increment_session_version(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_version INTEGER;
BEGIN
    -- 1. 增加 public.users 表中的 session_version
    UPDATE public.users
    SET session_version = session_version + 1,
        last_sign_in_at = NOW(),
        updated_at = NOW()
    WHERE id = target_user_id
    RETURNING session_version INTO new_version;

    -- 2. 同步更新 auth.users 表中的 raw_user_meta_data，以便下一次获取 token 时包含最新版本号
    -- 注意：这里需要使用 SECURITY DEFINER 权限来修改 auth 架构
    UPDATE auth.users
    SET raw_user_meta_data = 
        CASE 
            WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('session_version', new_version)
            ELSE raw_user_meta_data || jsonb_build_object('session_version', new_version)
        END
    WHERE id = target_user_id;

    RETURN new_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_session_version IS '增加用户的会话版本号并同步到 Auth 元数据，用于实现单点登录（踢出旧会话）';

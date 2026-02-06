CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  role_text TEXT;
  gender_text TEXT;
  role_val public.user_role;
  gender_val public.user_gender;
  region_val JSONB;
  source_app_val UUID;
BEGIN
  role_text := new.raw_user_meta_data->>'role';
  IF role_text IS NULL OR role_text NOT IN ('admin', 'editor', 'viewer', 'user') THEN
    role_val := 'user'::public.user_role;
  ELSE
    role_val := role_text::public.user_role;
  END IF;

  gender_text := new.raw_user_meta_data->>'gender';
  IF gender_text IS NULL OR gender_text NOT IN ('male', 'female', 'other', 'unknown') THEN
    gender_val := 'unknown'::public.user_gender;
  ELSE
    gender_val := gender_text::public.user_gender;
  END IF;

  region_val := public.safe_jsonb(new.raw_user_meta_data->>'region');
  source_app_val := public.safe_uuid(new.raw_user_meta_data->>'app_id');

  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    roles,
    gender,
    phone_number,
    region,
    source_app_id
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    ARRAY[role_val]::public.user_role[],
    gender_val,
    new.phone,
    region_val,
    source_app_val
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    roles = COALESCE(EXCLUDED.roles, public.users.roles),
    gender = COALESCE(EXCLUDED.gender, public.users.gender),
    phone_number = COALESCE(EXCLUDED.phone_number, public.users.phone_number),
    region = COALESCE(EXCLUDED.region, public.users.region),
    source_app_id = COALESCE(EXCLUDED.source_app_id, public.users.source_app_id),
    updated_at = NOW();

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


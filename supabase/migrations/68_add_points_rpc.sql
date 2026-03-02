
-- Migration to add increment_user_app_points RPC

CREATE OR REPLACE FUNCTION public.increment_user_app_points(
    p_user_id UUID,
    p_app_id UUID,
    p_points INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_app_relations (user_id, app_id, points)
    VALUES (p_user_id, p_app_id, p_points)
    ON CONFLICT (user_id, app_id) 
    DO UPDATE SET 
        points = COALESCE(public.user_app_relations.points, 0) + EXCLUDED.points,
        updated_at = NOW();
END;
$$;

-- Add RPC for incrementing prompt usage
CREATE OR REPLACE FUNCTION public.increment_prompt_usage(p_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.programming_prompts
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

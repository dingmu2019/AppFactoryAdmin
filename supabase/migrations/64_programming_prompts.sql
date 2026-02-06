-- Create Programming Prompts table
CREATE TABLE IF NOT EXISTS public.programming_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_content TEXT NOT NULL,
    optimized_content TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for search performance
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON public.programming_prompts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON public.programming_prompts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON public.programming_prompts (user_id);

-- Add RLS
ALTER TABLE public.programming_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prompts or admins can view all" ON public.programming_prompts
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles))
    );

CREATE POLICY "Users can insert their own prompts" ON public.programming_prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts" ON public.programming_prompts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts" ON public.programming_prompts
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_programming_prompts_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_programming_prompts_modtime
    BEFORE UPDATE ON public.programming_prompts
    FOR EACH ROW EXECUTE FUNCTION update_programming_prompts_modtime();

COMMENT ON TABLE public.programming_prompts IS '编程提示词管理表：存储用户原始和优化后的编程指令';

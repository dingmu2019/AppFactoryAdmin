-- Create Prompt Categories table
CREATE TABLE IF NOT EXISTS public.prompt_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add category_id and title to programming_prompts
ALTER TABLE public.programming_prompts ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.prompt_categories(id) ON DELETE SET NULL;
ALTER TABLE public.programming_prompts ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_prompt_categories_user_id ON public.prompt_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_category_id ON public.programming_prompts(category_id);

-- Add RLS for prompt_categories
ALTER TABLE public.prompt_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories or admins can view all" ON public.prompt_categories
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles))
    );

CREATE POLICY "Users can insert their own categories" ON public.prompt_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON public.prompt_categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON public.prompt_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at in prompt_categories
CREATE TRIGGER update_prompt_categories_modtime
    BEFORE UPDATE ON public.prompt_categories
    FOR EACH ROW EXECUTE FUNCTION update_programming_prompts_modtime();

-- Seed initial categories
INSERT INTO public.prompt_categories (name, code, description, sort_order) VALUES
('编程开发', 'PROGRAMMING', '包含 React, TypeScript, SQL 等编程相关提示词', 1),
('内容创作', 'WRITING', '文章、博文、营销文案创作提示词', 2),
('翻译润色', 'TRANSLATION', '多语言翻译、语法校优、语气润色提示词', 3),
('逻辑分析', 'ANALYSIS', '数据分析、逻辑推理、代码审查提示词', 4),
('其他', 'OTHER', '未分类的其他提示词', 99)
ON CONFLICT (code) DO NOTHING;

-- Update comments
COMMENT ON TABLE public.prompt_categories IS '提示词分类管理表';
COMMENT ON COLUMN public.prompt_categories.name IS '分类名称';
COMMENT ON COLUMN public.prompt_categories.code IS '分类编码';
COMMENT ON COLUMN public.prompt_categories.description IS '分类描述';
COMMENT ON COLUMN public.prompt_categories.sort_order IS '排序权重';
COMMENT ON COLUMN public.prompt_categories.is_active IS '是否启用';
COMMENT ON COLUMN public.programming_prompts.category_id IS '关联分类ID';
COMMENT ON COLUMN public.programming_prompts.title IS '提示词标题';

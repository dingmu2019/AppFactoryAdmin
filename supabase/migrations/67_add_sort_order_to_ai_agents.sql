-- Add sort_order to ai_agents table
ALTER TABLE public.ai_agents
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Initialize sort_order with a sequence for existing records
UPDATE public.ai_agents
SET sort_order = subquery.row_number
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_number
    FROM public.ai_agents
) AS subquery
WHERE public.ai_agents.id = subquery.id;

-- Add index for sort_order
CREATE INDEX IF NOT EXISTS idx_ai_agents_sort_order ON public.ai_agents (sort_order ASC);

COMMENT ON COLUMN public.ai_agents.sort_order IS '排序序号，用于自定义显示顺序';


-- 创建 ai_skills 表：用于存储 AI 技能/插件信息
CREATE TABLE IF NOT EXISTS ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- 唯一标识符
  name VARCHAR(255) NOT NULL, -- 技能名称
  description TEXT, -- 技能描述
  version VARCHAR(50) NOT NULL, -- 版本号
  author VARCHAR(100), -- 作者
  command VARCHAR(100) NOT NULL UNIQUE, -- 触发指令 (例如 @weather)
  storage_path TEXT NOT NULL, -- 解压后的存储路径
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb, -- 完整配置清单 (JSON)
  is_active BOOLEAN DEFAULT TRUE, -- 是否启用
  uploaded_by UUID REFERENCES auth.users(id), -- 上传者ID
  created_at TIMESTAMPTZ DEFAULT NOW(), -- 创建时间
  updated_at TIMESTAMPTZ DEFAULT NOW() -- 更新时间
);

-- 添加表和列的详细中文注释
COMMENT ON TABLE ai_skills IS 'AI 技能/插件表：由管理员上传并管理';
COMMENT ON COLUMN ai_skills.id IS '唯一标识符';
COMMENT ON COLUMN ai_skills.name IS '技能名称';
COMMENT ON COLUMN ai_skills.description IS '技能描述';
COMMENT ON COLUMN ai_skills.version IS '版本号';
COMMENT ON COLUMN ai_skills.author IS '作者';
COMMENT ON COLUMN ai_skills.command IS '触发指令 (例如 @weather)';
COMMENT ON COLUMN ai_skills.storage_path IS '解压后的存储路径';
COMMENT ON COLUMN ai_skills.manifest IS '完整配置清单 (JSON)';
COMMENT ON COLUMN ai_skills.is_active IS '是否启用';
COMMENT ON COLUMN ai_skills.uploaded_by IS '上传者ID';
COMMENT ON COLUMN ai_skills.created_at IS '创建时间';
COMMENT ON COLUMN ai_skills.updated_at IS '更新时间';

-- 启用行级安全策略 (RLS)
ALTER TABLE ai_skills ENABLE ROW LEVEL SECURITY;

-- 策略：允许认证用户读取
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_skills' 
        AND policyname = 'Enable read access for authenticated users'
    ) THEN
        CREATE POLICY "Enable read access for authenticated users" ON ai_skills
          FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_skills' 
        AND policyname = 'Enable all access for dashboard_user'
    ) THEN
        CREATE POLICY "Enable all access for dashboard_user" ON ai_skills
          FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 确保 uploaded_by 列存在 (针对已创建表的情况)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ai_skills' 
        AND column_name = 'uploaded_by'
    ) THEN
        ALTER TABLE ai_skills ADD COLUMN uploaded_by UUID REFERENCES auth.users(id);
        COMMENT ON COLUMN ai_skills.uploaded_by IS '上传者ID';
    END IF;
END $$;

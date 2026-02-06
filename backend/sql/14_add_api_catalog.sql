-- 创建 sys_api_definitions 表：用于存储系统API接口定义
CREATE TABLE IF NOT EXISTS sys_api_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- 唯一标识符
  path VARCHAR(255) NOT NULL, -- 接口路径
  method VARCHAR(10) NOT NULL, -- 请求方法 (GET, POST, etc.)
  summary VARCHAR(255), -- 接口摘要
  description TEXT, -- 接口详细描述
  category VARCHAR(50), -- 分类 (Auth, Products, etc.)
  auth_required BOOLEAN DEFAULT TRUE, -- 是否需要认证
  is_active BOOLEAN DEFAULT TRUE, -- 是否启用
  created_at TIMESTAMPTZ DEFAULT NOW(), -- 创建时间
  updated_at TIMESTAMPTZ DEFAULT NOW(), -- 更新时间
  UNIQUE(path, method) -- 路径和方法组合必须唯一
);

-- 添加表和列的详细中文注释
COMMENT ON TABLE sys_api_definitions IS '系统API接口定义表';
COMMENT ON COLUMN sys_api_definitions.id IS '唯一标识符';
COMMENT ON COLUMN sys_api_definitions.path IS '接口路径';
COMMENT ON COLUMN sys_api_definitions.method IS '请求方法';
COMMENT ON COLUMN sys_api_definitions.summary IS '接口摘要';
COMMENT ON COLUMN sys_api_definitions.description IS '接口详细描述';
COMMENT ON COLUMN sys_api_definitions.category IS '分类';
COMMENT ON COLUMN sys_api_definitions.auth_required IS '是否需要认证';
COMMENT ON COLUMN sys_api_definitions.is_active IS '是否启用';
COMMENT ON COLUMN sys_api_definitions.created_at IS '创建时间';
COMMENT ON COLUMN sys_api_definitions.updated_at IS '更新时间';

-- 启用行级安全策略 (RLS)
ALTER TABLE sys_api_definitions ENABLE ROW LEVEL SECURITY;

-- 策略：允许认证用户所有操作
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sys_api_definitions' 
        AND policyname = 'Enable all access for authenticated users'
    ) THEN
        CREATE POLICY "Enable all access for authenticated users" ON sys_api_definitions
          FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 插入初始数据
INSERT INTO sys_api_definitions (path, method, summary, description, category, auth_required) VALUES
('/api/v1/auth/login', 'POST', 'User Login', 'Authenticate user and return JWT token.', 'Auth', false),
('/api/v1/products', 'GET', 'List Products', 'Get a list of all active products.', 'Products', true),
('/api/v1/products/:id', 'GET', 'Get Product Detail', 'Get detailed information about a specific product.', 'Products', true),
('/api/v1/orders', 'POST', 'Create Order', 'Create a new order for the authenticated user.', 'Orders', true),
('/api/v1/orders', 'GET', 'List Orders', 'Get a list of past orders.', 'Orders', true),
('/api/ai/chat', 'POST', 'AI Chat Completion', 'Send a message to the AI assistant and get a response.', 'AI', true)
ON CONFLICT (path, method) DO NOTHING;

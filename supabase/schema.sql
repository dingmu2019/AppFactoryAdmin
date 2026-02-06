-- 启用 UUID 扩展
-- 该扩展用于生成唯一的 UUID 标识符，作为各表的主键
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. 枚举类型 (Enum Types) - 用于确保数据完整性和规范性
-- -----------------------------------------------------------------------------

-- 用户角色枚举
-- admin: 系统管理员，拥有所有权限
-- editor: 编辑者，可以管理内容但不能管理系统设置
-- viewer: 观察者，仅具有查看权限
-- user: 普通注册用户
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer', 'user');

-- 用户状态枚举
-- active: 正常活跃状态
-- inactive: 未激活或暂时停用
-- banned: 已被封禁
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');

-- 用户性别枚举
-- male: 男性
-- female: 女性
-- other: 其他
-- unknown: 未知/保密
CREATE TYPE user_gender AS ENUM ('male', 'female', 'other', 'unknown');

-- -----------------------------------------------------------------------------
-- 2. 用户表 (public.users) - 扩展 Supabase auth.users 表
-- -----------------------------------------------------------------------------
-- 该表存储用户的公开资料信息。
-- 它是 Supabase 内置 auth.users 表的映射，通过触发器 (Trigger) 保持数据自动同步。
-- 所有的业务关联（如应用所有者、日志记录者）都应关联到此表，而不是直接关联 auth.users。
CREATE TABLE public.users (
    -- id: 关联 auth.users 的主键，并在删除 auth 用户时级联删除此记录
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- email: 用户邮箱，从 auth.users 复制而来，便于业务查询
    email VARCHAR(255) NOT NULL,
    
    -- full_name: 用户全名或昵称
    full_name VARCHAR(255),
    
    -- avatar_url: 用户头像链接
    avatar_url TEXT,
    
    -- roles: 用户角色数组，默认为包含 'user' 的数组
    -- 使用数组类型支持一个用户拥有多个角色
    roles user_role[] DEFAULT ARRAY['user']::user_role[],
    
    -- status: 用户账号状态，默认为 'active'
    status user_status DEFAULT 'active',

    -- gender: 用户性别，默认为 'unknown'
    gender user_gender DEFAULT 'unknown',
    
    -- phone_number: 手机号码（国际化 E.164 格式，如 +8613800000000）
    phone_number VARCHAR(50),
    
    -- region: 所在地区信息 (JSONB格式: {country: "CN", province: "Beijing", city: "Beijing"})
    region JSONB,
    
    -- session_version: 会话版本号，用于单点登录/强制下线
    -- 每次登录时自增，API 或 RLS 需校验 JWT 中的 version 是否与此一致
    session_version INTEGER DEFAULT 1,

    -- source_app_id: 注册来源应用ID
    -- 记录用户是从哪个应用注册进来的
    -- 注意：此处不使用外键强约束 saas_apps(id)，以避免循环依赖问题（saas_apps 表尚未创建）
    -- 建议在业务逻辑层维护一致性，或在 saas_apps 创建后通过 ALTER TABLE 添加约束
    source_app_id UUID,
    
    -- last_sign_in_at: 最后登录时间
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    
    -- created_at: 账号创建时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- updated_at: 资料最后更新时间
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加表和字段注释
COMMENT ON TABLE public.users IS '用户表：存储用户的公开资料信息，与 Supabase auth.users 表同步';
COMMENT ON COLUMN public.users.id IS '用户ID，关联 auth.users 表的主键';
COMMENT ON COLUMN public.users.email IS '用户邮箱';
COMMENT ON COLUMN public.users.full_name IS '用户全名';
COMMENT ON COLUMN public.users.avatar_url IS '用户头像链接';
COMMENT ON COLUMN public.users.roles IS '用户角色数组：支持多角色 (admin, editor, viewer, user)';
COMMENT ON COLUMN public.users.status IS '用户状态：active, inactive, banned';
COMMENT ON COLUMN public.users.gender IS '用户性别：male, female, other, unknown';
COMMENT ON COLUMN public.users.phone_number IS '手机号码（国际化 E.164 格式）';
COMMENT ON COLUMN public.users.region IS '所在地区信息 (JSONB: country, province, city)';
COMMENT ON COLUMN public.users.session_version IS '会话版本号：用于实现单点登录和强制下线机制';
COMMENT ON COLUMN public.users.source_app_id IS '注册来源应用ID：记录用户最初是从哪个应用注册的';
COMMENT ON COLUMN public.users.last_sign_in_at IS '最后登录时间';
COMMENT ON COLUMN public.users.created_at IS '账号创建时间';
COMMENT ON COLUMN public.users.updated_at IS '资料最后更新时间';

-- 启用行级安全策略 (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS 策略定义

-- 策略 1: 用户可以查看自己的个人资料
-- auth.uid() 是 Supabase 提供的函数，返回当前登录用户的 UUID
CREATE POLICY "用户可以查看自己的资料" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- 策略 2: 用户可以更新自己的个人资料
-- 限制用户只能修改自己的行
CREATE POLICY "用户可以更新自己的资料" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- 策略 3: 管理员可以查看所有用户的资料
-- 检查当前用户的 roles 数组中是否包含 'admin'
CREATE POLICY "管理员可以查看所有资料" ON public.users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND 'admin' = ANY(roles))
    );

-- -----------------------------------------------------------------------------
-- 3. 触发器 (Trigger) - 自动处理新用户注册
-- -----------------------------------------------------------------------------
-- 该函数在 Supabase Auth 表有新用户插入时执行
-- 它会自动在 public.users 表中创建对应的记录，防止数据不同步
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role user_role := 'user';
    meta_role text;
BEGIN
    -- 从元数据中提取角色字符串
    meta_role := new.raw_user_meta_data->>'role';
    
    -- 尝试转换元数据中的角色，如果无效则使用默认值 'user'
    -- 并将其包装为数组
    
    INSERT INTO public.users (id, email, full_name, avatar_url, roles, gender, phone_number, region, source_app_id)
    VALUES (
        new.id, -- 对应 auth.users.id
        new.email, -- 对应 auth.users.email
        new.raw_user_meta_data->>'full_name', -- 从元数据中提取姓名
        new.raw_user_meta_data->>'avatar_url', -- 从元数据中提取头像
        
        -- 处理角色数组：优先使用元数据中的角色，转为数组
        ARRAY[COALESCE(meta_role::user_role, default_role)]::user_role[],
        
        -- 从元数据中提取性别，默认为 'unknown'
        COALESCE((new.raw_user_meta_data->>'gender')::user_gender, 'unknown'),
        
        new.phone, -- 从 auth.users.phone 同步
        (new.raw_user_meta_data->>'region')::jsonb, -- 从元数据中提取地区信息
        (new.raw_user_meta_data->>'app_id')::uuid -- 从元数据中提取注册应用ID
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 触发器定义：绑定到 auth.users 表的 INSERT 操作后
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. 业务数据表 (Business Tables)
-- -----------------------------------------------------------------------------

-- SaaS 应用表
-- 存储平台上创建的所有 SaaS 应用的基本信息
CREATE TABLE saas_apps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- 应用名称
    description TEXT, -- 应用描述
    status VARCHAR(50) DEFAULT 'Development', -- 应用状态 (如: Development, Production)
    api_key VARCHAR(255) UNIQUE, -- 应用的 API Key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 创建时间
    owner_id UUID REFERENCES public.users(id) -- 所有者 ID，关联到 public.users
);

-- 添加表和字段注释
COMMENT ON TABLE saas_apps IS 'SaaS应用表：存储平台上的应用基本信息';
COMMENT ON COLUMN saas_apps.id IS '应用ID';
COMMENT ON COLUMN saas_apps.name IS '应用名称';
COMMENT ON COLUMN saas_apps.description IS '应用描述';
COMMENT ON COLUMN saas_apps.status IS '应用状态';
COMMENT ON COLUMN saas_apps.api_key IS 'API密钥';
COMMENT ON COLUMN saas_apps.created_at IS '创建时间';
COMMENT ON COLUMN saas_apps.owner_id IS '所有者ID';

-- 产品表
-- 定义 SaaS 应用下的具体产品或服务单元
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES saas_apps(id) ON DELETE CASCADE, -- 所属应用 ID，应用删除时级联删除产品
    sku VARCHAR(100) NOT NULL, -- 库存单位/编码
    name JSONB NOT NULL, -- 产品名称 (支持多语言 JSON 格式，如 { "en": "Name", "zh": "名称" })
    type VARCHAR(50) NOT NULL, -- 产品类型
    price DECIMAL(10, 2) DEFAULT 0.00 -- 基础价格
);

-- 添加表和字段注释
COMMENT ON TABLE products IS '产品表：定义SaaS应用下的具体产品';
COMMENT ON COLUMN products.id IS '产品ID';
COMMENT ON COLUMN products.app_id IS '所属应用ID';
COMMENT ON COLUMN products.sku IS 'SKU编码';
COMMENT ON COLUMN products.name IS '产品名称(多语言JSON)';
COMMENT ON COLUMN products.type IS '产品类型';
COMMENT ON COLUMN products.price IS '基础价格';

-- -----------------------------------------------------------------------------
-- 5. 日志系统 (Logging System)
-- -----------------------------------------------------------------------------

-- 系统错误日志表 (Error Logs)
-- 主要用于记录系统发生错误时记录的信息，以便排查系统问题
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- level: 日志级别 (如 error, critical, warning)
    level VARCHAR(20) NOT NULL,
    
    -- message: 错误摘要信息
    message TEXT NOT NULL,
    
    -- stack_trace: 详细的堆栈跟踪信息 (可选)
    stack_trace TEXT,
    
    -- context: 错误上下文信息 (JSONB)
    -- 包含: request_url, method, params, user_agent 等
    context JSONB,
    
    -- app_id: 来源应用ID
    -- 如果是后台管理系统本身，则记录为 'AdminSys'
    -- 如果是 SaaS 应用，则记录其 UUID
    app_id VARCHAR(100),
    
    -- resolved: 是否已解决 (默认 false)
    resolved BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加表和字段注释
COMMENT ON TABLE error_logs IS '系统错误日志表：记录系统异常和错误信息用于排查问题';
COMMENT ON COLUMN error_logs.level IS '日志级别 (error, critical, warning)';
COMMENT ON COLUMN error_logs.message IS '错误摘要';
COMMENT ON COLUMN error_logs.stack_trace IS '堆栈跟踪';
COMMENT ON COLUMN error_logs.context IS '错误上下文 (JSONB)';
COMMENT ON COLUMN error_logs.app_id IS '来源应用ID (AdminSys 或 UUID)';
COMMENT ON COLUMN error_logs.resolved IS '是否已解决';


-- 审计日志表 (Audit Logs / User Behavior Logs)
-- 用于记录用户的关键行为操作，满足合规性和安全审计需求
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- user_id: 操作用户 ID
    user_id UUID REFERENCES public.users(id),
    
    -- action: 行为动作 (如: login, create_app, update_profile)
    action VARCHAR(100) NOT NULL,
    
    -- resource: 操作的目标资源 (如: app:uuid, user:uuid)
    resource VARCHAR(100),
    
    -- details: 操作详情 (JSONB)
    -- 包含: 修改前后的值 (diff), 具体参数等
    details JSONB,
    
    -- ip_address: 用户 IP 地址
    ip_address VARCHAR(50),
    
    -- user_agent: 用户设备信息
    user_agent TEXT,
    
    -- app_id: 来源应用ID
    -- 如果是后台管理系统本身，则记录为 'AdminSys'
    -- 如果是 SaaS 应用，则记录其 UUID
    app_id VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加表和字段注释
COMMENT ON TABLE audit_logs IS '审计日志表：记录用户关键行为，用于安全审计';
COMMENT ON COLUMN audit_logs.user_id IS '操作用户ID';
COMMENT ON COLUMN audit_logs.action IS '行为动作 (如 login, create_app)';
COMMENT ON COLUMN audit_logs.resource IS '操作目标资源标识';
COMMENT ON COLUMN audit_logs.details IS '操作详情 (JSONB)';
COMMENT ON COLUMN audit_logs.ip_address IS '用户IP地址';
COMMENT ON COLUMN audit_logs.user_agent IS '用户设备User-Agent';
COMMENT ON COLUMN audit_logs.app_id IS '来源应用ID (AdminSys 或 UUID)';

-- 删除旧的 system_logs 表 (如果存在)
DROP TABLE IF EXISTS system_logs;

-- -----------------------------------------------------------------------------
-- 6. 后置约束 (Post-Constraints)
-- -----------------------------------------------------------------------------
-- 在所有表创建完成后，添加 source_app_id 的外键约束
-- 这样可以避免 users 和 saas_apps 之间的循环依赖问题
ALTER TABLE public.users
ADD CONSTRAINT fk_users_source_app
FOREIGN KEY (source_app_id) REFERENCES saas_apps(id) ON DELETE SET NULL;

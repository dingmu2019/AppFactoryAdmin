-- Add WeChat related fields to users table for QR code login support

-- Add columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(255),
ADD COLUMN IF NOT EXISTS wechat_unionid VARCHAR(255),
ADD COLUMN IF NOT EXISTS wechat_info JSONB;

-- Add comments
COMMENT ON COLUMN public.users.wechat_openid IS '微信 OpenID，用于标识用户在特定应用（公众号/小程序/网站应用）下的唯一身份';
COMMENT ON COLUMN public.users.wechat_unionid IS '微信 UnionID，用于在同一微信开放平台账号下的不同应用间唯一标识用户';
COMMENT ON COLUMN public.users.wechat_info IS '微信用户原始信息快照（包含昵称、头像等元数据）';

-- Add indexes for faster lookup during login
CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON public.users(wechat_openid);
CREATE INDEX IF NOT EXISTS idx_users_wechat_unionid ON public.users(wechat_unionid);


import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// 默认客户端（匿名/客户端用）
// 注意：在服务端请求中，如果带有 Authorization Header，此客户端会自动应用 RLS
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

/**
 * 管理员客户端（绕过 RLS）
 * 采用 Lazy 模式初始化，确保在运行时（Runtime）获取最新的环境变量
 * 避免在 Build Time 提前固化空值，同时确保 Service Role 真正生效以绕过 RLS
 */
let adminClient: any = null;

export const getSupabaseAdmin = () => {
  if (adminClient) return adminClient;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Supabase] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in production! Admin operations will fail due to RLS.');
    }
    // 回退到 Anon Key 会导致后台功能因 RLS 限制而无法显示数据（除非用户本身是 DB 中的 Admin）
    adminClient = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  } else {
    adminClient = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  
  return adminClient;
};

// 导出别名以保持向后兼容，但建议后续使用 getSupabaseAdmin()
// 注意：此导出在模块加载时会执行一次初始化，如果此时环境变量未就绪，
// 后续调用 getSupabaseAdmin() 会重新尝试（如果是第一次调用的话）
export const supabaseAdmin = getSupabaseAdmin();

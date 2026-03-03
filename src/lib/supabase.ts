
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

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
let adminClientMode: 'service' | 'anon' | null = null;
let adminClientKeySig: string | null = null;

export const getSupabaseAdmin = () => {
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const desiredMode: 'service' | 'anon' = serviceKey ? 'service' : 'anon';
  const desiredKeySig = serviceKey ? serviceKey.slice(0, 12) : supabaseAnonKey.slice(0, 12);

  // 如果已有实例且 Key 没变，直接返回
  if (adminClient && adminClientMode === desiredMode && adminClientKeySig === desiredKeySig) return adminClient;
  
  // 如果 Key 变化了或第一次加载，重新初始化
  if (!serviceKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Supabase] WARNING: SUPABASE_SERVICE_ROLE_KEY is missing in production! Falling back to Anon Key.');
    }
    adminClient = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    adminClientMode = 'anon';
    adminClientKeySig = supabaseAnonKey.slice(0, 12);
    return adminClient;
  }

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
  adminClientMode = 'service';
  adminClientKeySig = serviceKey.slice(0, 12);
  
  return adminClient;
};

export const getSupabaseForRequest = (req: Request) => {
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (serviceKey) return getSupabaseAdmin();

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    }
  );
};

// 导出代理对象以保持向后兼容，确保每次访问都获取最新的 adminClient
export const supabaseAdmin = new Proxy({}, {
  get: (target, prop) => {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    // 如果是函数（如 .from, .auth 等），必须绑定 client 实例
    return typeof value === 'function' ? value.bind(client) : value;
  }
}) as any;

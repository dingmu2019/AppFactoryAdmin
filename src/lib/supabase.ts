
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
// 优先使用 SERVICE_ROLE_KEY，如果不存在则退化为 Anon Key（但可能会导致权限不足）
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// 默认客户端（匿名/客户端用）
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// 管理员客户端（绕过 RLS）
// 注意：仅在服务端使用！不要在客户端组件中使用！
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

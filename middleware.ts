
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
  
  // 兼容截断后的环境变量名
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                           process.env.NEXT_PUBLIC_SUPABASE_ANC || 
                           '').trim();
  
  // 初始化 Supabase 客户端，用于处理会话
  const supabase = createServerClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
      cookies: {
        getAll() {
          return parseCookieHeader(req.headers.get('Cookie') ?? '')
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value))
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    }
  );
  
  // 获取当前会话信息
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;

  // 如果是公共路由（如 /auth 或 /api/public），则跳过认证检查
  if (path.startsWith('/auth') || path.startsWith('/api/public')) {
    return res;
  }

  // API 认证逻辑：保护 /api/admin/* 路由
  if (path.startsWith('/api/admin')) {
    if (!user) {
      // 如果未登录，返回 401 未授权错误
      return NextResponse.json(
        { error: 'Unauthorized: Please login first' },
        { status: 401 }
      );
    }
  }

  return res;
}

export const config = {
  matcher: [
    // 匹配所有路径，除了静态资源和 Next.js 内部路径
    '/((?!_next/static|_next/image|favicon.ico|.well-known).*)',
  ],
};

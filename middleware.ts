
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
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '';
  
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
          cookiesToSet.forEach(({ name, value, options }) => {
            // Apply global cookie domain if provided
            const finalOptions = cookieDomain ? { ...options, domain: cookieDomain } : options;
            req.cookies.set(name, value);
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            // Apply global cookie domain if provided
            const finalOptions = cookieDomain ? { ...options, domain: cookieDomain } : options;
            res.cookies.set(name, value, finalOptions);
          });
        },
      },
    }
  );
  
  // 获取当前会话信息
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (e) {
    console.error('[Middleware] Supabase getUser error:', e);
  }

  const path = req.nextUrl.pathname;
  const isPublicPath = path.startsWith('/auth') || path.startsWith('/api/public');

  // 如果是公共路由，则跳过认证检查
  if (isPublicPath) {
    return res;
  }

  // 如果没有通过 Cookie 获取到用户，尝试通过 Authorization Header 校验 (针对 API 请求)
  if (!user) {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const { data: { user: bearerUser } } = await supabase.auth.getUser(token);
        if (bearerUser) {
          user = bearerUser;
        }
      } catch (e) {
        console.error('[Middleware] Bearer token validation error:', e);
      }
    }
  }

  // 1. 提取用户角色和会话版本 (从 user_metadata)
  const role = user?.user_metadata?.role;
  const tokenSessionVersion = parseInt(user?.user_metadata?.session_version || '0');

  // 2. 如果用户已登录，进行核心校验：角色权限 + 单会话踢出校验
  if (user) {
    // --- 强制踢出校验 (Single Session Control) ---
    // 查询数据库中该用户的最新 session_version
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('session_version')
      .eq('id', user.id)
      .single();

    if (!userError && userData) {
      const dbSessionVersion = userData.session_version || 0;
      // 如果数据库中的版本号大于当前 Token 中的版本号，说明该账号已在别处重新登录
      if (dbSessionVersion > tokenSessionVersion) {
        console.log(`[Middleware] Session kicked for ${user.email}: DB version ${dbSessionVersion} > Token version ${tokenSessionVersion}`);
        // 清理会话并重定向到登录页，提示“已在别处登录”
        const url = req.nextUrl.clone();
        url.pathname = '/auth/login';
        url.searchParams.set('error', 'session_expired');
        const response = NextResponse.redirect(url);
        
        // 尝试清除 Cookie
        const domainSuffix = cookieDomain ? `; Domain=${cookieDomain}` : '';
        response.cookies.delete('sb-access-token');
        response.cookies.delete('sb-refresh-token');
        
        return response;
      }
    }

    const allowedRoles = ['admin', 'editor', 'viewer'];
    // 如果角色是 'user' 且不在允许的角色列表中，则拦截
    const isRestricted = role === 'user' || !allowedRoles.includes(role);

    if (isRestricted) {
      // 4. 对于 API 路由，返回 403 Forbidden JSON
      if (path.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden: Access denied' },
          { status: 403 }
        );
      }
      
      // 3. 对于页面，重定向到 /auth/login?error=unauthorized
      const url = req.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }
  }

  // API 认证逻辑：保护 /api/admin/* 路由 (针对未登录用户)
  if (path.startsWith('/api/admin') && !user) {
    return NextResponse.json(
      { error: 'Unauthorized: Please login first' },
      { status: 401 }
    );
  }

  return res;
}

export const config = {
  matcher: [
    // 匹配所有路径，除了静态资源和 Next.js 内部路径
    '/((?!_next/static|_next/image|favicon.ico|.well-known).*)',
  ],
};

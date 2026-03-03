
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';
import { SystemLogger } from '@/lib/logger';
import { withApiErrorHandling, safeAfter } from '@/lib/api-wrapper';

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: 获取用户列表
 *     responses:
 *       200:
 *         description: 用户列表
 */
export const GET = withApiErrorHandling(async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    
    // 诊断环境变量信息（非敏感）
    const envDiagnostics = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'local',
    };

    const supabase = getSupabaseForRequest(req);

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    if (role) {
      query = query.contains('roles', [role]);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      safeAfter(() => SystemLogger.logError({
        level: 'ERROR',
        message: `[User Management API] Fetch failed: ${error.message}`,
        stack_trace: error.details || error.hint,
        path: '/api/admin/users',
        method: 'GET',
        context: { error, envDiagnostics }
      }));
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
        diagnostics: envDiagnostics
      }, { status: 500 });
    }

    // Calculate "Today New"
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayNew } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    return NextResponse.json({
      data,
      total: count,
      page,
      pageSize,
      todayNew: todayNew || 0,
      _debug: process.env.NODE_ENV === 'development' ? { envDiagnostics } : undefined
    });
});

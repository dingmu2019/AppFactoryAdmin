
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';
import { SystemLogger } from '@/lib/logger';
import { withApiErrorHandling, safeAfter } from '@/lib/api-wrapper';

// GET /api/admin/product-categories
export const GET = withApiErrorHandling(async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search');
    const appId = searchParams.get('app_id');
    
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
      .from('product_categories')
      .select('*, saas_apps(name)', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    if (appId) {
      query = query.eq('app_id', appId);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
       // 记录详细错误日志 (异步)
       safeAfter(() => SystemLogger.logError({
           level: 'ERROR',
           message: `[Product Categories API] Fetch failed: ${error.message}`,
           stack_trace: error.details || error.hint,
           path: '/api/admin/product-categories',
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

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    });
});

// POST /api/admin/product-categories
export const POST = withApiErrorHandling(async (req: NextRequest) => {
    const body = await req.json();
    const { name, code, description, app_id, parent_id, sort_order } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }
    
    const supabase = getSupabaseForRequest(req);

    const { data, error } = await supabase
      .from('product_categories')
      .insert({
        name,
        code,
        description,
        app_id,
        parent_id,
        sort_order: sort_order || 0
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
});

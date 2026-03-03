
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';
import { SystemLogger } from '@/lib/logger';
import { withApiErrorHandling, safeAfter } from '@/lib/api-wrapper';

export const GET = withApiErrorHandling(async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const category_id = searchParams.get('category_id');
    const status = searchParams.get('status');
    const app_id = searchParams.get('app_id');
    
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
        .from('products')
        .select(`
          *,
          category:product_categories(id, name, code),
          app:saas_apps(id, name)
        `)
        .order('created_at', { ascending: false });

    if (category_id) query = query.eq('category_id', category_id);
    if (status) query = query.eq('status', status);
    if (app_id) query = query.eq('app_id', app_id);
    
    const { data, error } = await query;

    if (error) {
        // 记录详细错误日志 (异步)
        safeAfter(() => SystemLogger.logError({
            level: 'ERROR',
            message: `[Products API] Fetch failed: ${error.message}`,
            stack_trace: error.details || error.hint,
            path: '/api/admin/products',
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
    return NextResponse.json(data);
});


import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const level = searchParams.get('level');
    const search = searchParams.get('search');
    const app_id = searchParams.get('app_id');
    const resolved = searchParams.get('resolved');
    
    const supabase = getSupabaseAdmin();

    // Determine which table to query
    // Prefer 'system_error_logs' for consistency with stats
    const tableName = 'system_error_logs';
    
    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact' });

    // Filters
    if (level && level !== 'all') {
      query = query.eq('level', level);
    }
    
    if (app_id && app_id !== 'all') {
      query = query.eq('app_id', app_id);
    }

    if (resolved === 'true' || resolved === 'false') {
      query = query.eq('resolved', resolved === 'true');
    }

    if (search) {
      // system_error_logs has 'message', 'path', 'stack' usually
      query = query.or(`message.ilike.%${search}%,path.ilike.%${search}%`);
    }

    // Pagination
    const pageNum = Math.max(1, page);
    const limit = Math.max(1, Math.min(100, pageSize));
    const from = (pageNum - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('System Logs Query Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page: pageNum,
      pageSize: limit,
      totalPages: count ? Math.ceil(count / limit) : 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { withApiErrorHandling } from '@/lib/api-wrapper';

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');
  const orderNo = searchParams.get('orderNo');
  const status = searchParams.get('status');
  const appId = searchParams.get('appId');

    let query = supabase
      .from('orders')
      .select('*, saas_apps(name), users(email, full_name)', { count: 'exact' });

    if (orderNo) {
      query = query.ilike('order_no', `%${orderNo}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }
    
    if (appId) {
      query = query.eq('source_app_id', appId); // Ensure column name matches DB
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return NextResponse.json({
      data,
      total: count,
      page,
      pageSize,
      totalPages
    });
});

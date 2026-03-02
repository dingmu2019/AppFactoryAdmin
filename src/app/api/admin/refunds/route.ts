
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// GET /api/admin/refunds
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    
    const refundNo = searchParams.get('refundNo') || '';
    const orderNo = searchParams.get('orderNo') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';

    let orderIds: string[] | null = null;
    if (orderNo) {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .ilike('order_no', `%${orderNo}%`)
        .limit(500);

      if (ordersError) throw ordersError;
      orderIds = (ordersData || []).map((o: any) => o.id);
      if (orderIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
      }
    }

    let query = supabase
      .from('refunds')
      .select(
        `
        *,
        order:orders(
          id,
          order_no,
          pay_amount,
          currency,
          status,
          created_at,
          saas_apps(name),
          users(email, full_name)
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (refundNo) {
      query = query.ilike('refund_no', `%${refundNo}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (orderIds) {
      query = query.in('order_id', orderIds);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

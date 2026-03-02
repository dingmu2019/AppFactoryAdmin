
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// GET /api/admin/refunds/stats
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysISO = last7Days.toISOString();

    // 1. Today's Stats
    const { count: todayCount, error: todayCountError } = await supabase
      .from('refunds')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);
    if (todayCountError) throw todayCountError;

    const { data: todayAmountRows, error: todayAmountError } = await supabase
      .from('refunds')
      .select('amount')
      .gte('created_at', todayISO)
      .eq('status', 'success');
    if (todayAmountError) throw todayAmountError;
    const todayAmount = (todayAmountRows || []).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);

    // 2. Last 7 Days Stats
    const { count: last7DaysCount, error: last7DaysCountError } = await supabase
      .from('refunds')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last7DaysISO);
    if (last7DaysCountError) throw last7DaysCountError;

    const { data: last7DaysAmountRows, error: last7DaysAmountError } = await supabase
      .from('refunds')
      .select('amount')
      .gte('created_at', last7DaysISO)
      .eq('status', 'success');
    if (last7DaysAmountError) throw last7DaysAmountError;
    const last7DaysAmount = (last7DaysAmountRows || []).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);

    // 3. Total Stats
    const { count: totalCount, error: totalCountError } = await supabase
      .from('refunds')
      .select('*', { count: 'exact', head: true });
    if (totalCountError) throw totalCountError;

    return NextResponse.json({
      todayCount: todayCount || 0,
      todayAmount: todayAmount || 0,
      last7DaysCount: last7DaysCount || 0,
      last7DaysAmount: last7DaysAmount || 0,
      totalCount: totalCount || 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

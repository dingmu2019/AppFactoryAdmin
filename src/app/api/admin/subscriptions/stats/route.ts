
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// GET /api/admin/subscriptions/stats
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysISO = last7Days.toISOString();

    // 1. Today's New Subscriptions
    const { count: todayNew, error: todayNewError } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);
    if (todayNewError) throw todayNewError;

    // 2. Last 7 Days New Subscriptions
    const { count: last7DaysNew, error: last7DaysNewError } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last7DaysISO);
    if (last7DaysNewError) throw last7DaysNewError;

    // 3. Last 7 Days Expiring Subscriptions (Expiring in next 7 days)
    const next7Days = new Date(now);
    next7Days.setDate(next7Days.getDate() + 7);
    const { count: expiringCount, error: expiringError } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', next7Days.toISOString());
    if (expiringError) throw expiringError;

    return NextResponse.json({
      success: true,
      data: {
        todayNew: todayNew || 0,
        last7DaysNew: last7DaysNew || 0,
        last7DaysExpiring: expiringCount || 0
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

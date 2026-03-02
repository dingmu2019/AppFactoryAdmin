
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    // Parallel queries for stats
    const [todayCount, unresolvedCount, fatalCount] = await Promise.all([
      // 1. Today's Total
      supabase
        .from('system_error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayIso),
      
      // 2. Unresolved Errors
      supabase
        .from('system_error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false),

      // 3. Fatal Errors (Today's Fatal for "Critical Issues")
      supabase
        .from('system_error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'FATAL')
    ]);

    return NextResponse.json({
      today_count: todayCount.count || 0,
      unresolved_count: unresolvedCount.count || 0,
      fatal_count: fatalCount.count || 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

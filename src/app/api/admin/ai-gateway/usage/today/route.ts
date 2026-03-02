
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('appId');
    if (!appId) return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    const { data: policy, error: policyError } = await supabase.from('ai_gateway_policies').select('daily_token_limit, daily_request_limit').eq('app_id', appId).maybeSingle();
    if (policyError) return NextResponse.json({ error: policyError.message }, { status: 500 });
    const { data: usageData, error: usageError } = await supabase.rpc('ai_gateway_usage_today', { p_app_id: appId });
    if (usageError) return NextResponse.json({ error: usageError.message }, { status: 500 });
    const row = Array.isArray(usageData) ? usageData[0] : usageData;
    return NextResponse.json({ data: { total_tokens: Number(row?.total_tokens || 0), request_count: Number(row?.request_count || 0), daily_token_limit: policy?.daily_token_limit ?? null, daily_request_limit: policy?.daily_request_limit ?? null } });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

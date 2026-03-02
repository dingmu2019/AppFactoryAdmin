
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const ensureAlertRule = async (appId: string) => {
  const { data: existing, error: e1 } = await supabase.from('ai_gateway_alert_rules').select('*').eq('app_id', appId).maybeSingle();
  if (e1) throw e1;
  if (existing) return existing as any;

  const payload = {
    app_id: appId,
    is_enabled: false,
    token_usage_threshold: 0.8,
    request_usage_threshold: 0.8,
    error_rate_threshold: 0.05,
    p95_latency_threshold_ms: 2000,
    window_minutes: 60,
    cooldown_minutes: 60,
    recipients: [] as string[],
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase.from('ai_gateway_alert_rules').insert(payload).select('*').single();
  if (error) throw error;
  return data as any;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('appId');
    if (!appId) return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    const rule = await ensureAlertRule(appId);
    return NextResponse.json({ data: rule });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

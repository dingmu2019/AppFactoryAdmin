
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
    const { data: policy, error: policyError } = await supabase.from('ai_gateway_policies').select('daily_token_limit, daily_request_limit').eq('app_id', appId).maybeSingle();
    if (policyError) return NextResponse.json({ error: policyError.message }, { status: 500 });
    const { data: usageData, error: usageError } = await supabase.rpc('ai_gateway_usage_today', { p_app_id: appId });
    if (usageError) return NextResponse.json({ error: usageError.message }, { status: 500 });
    const uRow = Array.isArray(usageData) ? usageData[0] : usageData;
    const usage = { total_tokens: Number(uRow?.total_tokens || 0), request_count: Number(uRow?.request_count || 0), daily_token_limit: policy?.daily_token_limit ?? null, daily_request_limit: policy?.daily_request_limit ?? null };
    const { data: wData, error: wErr } = await supabase.rpc('ai_gateway_window_metrics', { p_app_id: appId, p_minutes: Number(rule.window_minutes || 60) });
    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });
    const wRow = Array.isArray(wData) ? wData[0] : wData;
    const windowMetrics = { request_count: Number(wRow?.request_count || 0), error_count: Number(wRow?.error_count || 0), error_rate: Number(wRow?.error_rate || 0), p95_latency_ms: Number(wRow?.p95_latency_ms || 0), total_tokens: Number(wRow?.total_tokens || 0) };
    const tokenRatio = usage.daily_token_limit && usage.daily_token_limit > 0 ? usage.total_tokens / usage.daily_token_limit : null;
    const requestRatio = usage.daily_request_limit && usage.daily_request_limit > 0 ? usage.request_count / usage.daily_request_limit : null;
    const breaches = { token: tokenRatio != null ? tokenRatio >= Number(rule.token_usage_threshold || 0.8) : false, request: requestRatio != null ? requestRatio >= Number(rule.request_usage_threshold || 0.8) : false, error_rate: windowMetrics.request_count > 0 ? windowMetrics.error_rate >= Number(rule.error_rate_threshold || 0.05) : false, p95_latency: windowMetrics.request_count > 0 ? windowMetrics.p95_latency_ms >= Number(rule.p95_latency_threshold_ms || 2000) : false };
    return NextResponse.json({ data: { rule, usage, window: windowMetrics, ratios: { tokenRatio, requestRatio }, breaches } });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

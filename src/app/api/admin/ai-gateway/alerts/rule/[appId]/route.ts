
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export async function PUT(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const { appId } = await params;
    if (!appId) return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    const body = await req.json();
    const recipients = Array.isArray(body.recipients) ? body.recipients.map((s: any) => String(s || '').trim()).filter(Boolean) : typeof body.recipients_text === 'string' ? body.recipients_text.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const payload: any = { app_id: appId, is_enabled: Boolean(body.is_enabled), token_usage_threshold: clamp01(Number(body.token_usage_threshold ?? 0.8)), request_usage_threshold: clamp01(Number(body.request_usage_threshold ?? 0.8)), error_rate_threshold: clamp01(Number(body.error_rate_threshold ?? 0.05)), p95_latency_threshold_ms: Math.max(0, Number(body.p95_latency_threshold_ms ?? 2000)), window_minutes: Math.max(1, Number(body.window_minutes ?? 60)), cooldown_minutes: Math.max(0, Number(body.cooldown_minutes ?? 60)), recipients, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('ai_gateway_alert_rules').upsert(payload, { onConflict: 'app_id' }).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

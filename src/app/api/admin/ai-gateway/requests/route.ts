
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('appId');
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;
    const requestId = searchParams.get('requestId')?.trim();
    const endpoint = searchParams.get('endpoint')?.trim();
    const day = searchParams.get('day')?.trim();
    
    if (!appId) return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    const safeLimit = Number.isFinite(limit) ? Math.min(200, Math.max(1, limit)) : 50;
    let q = supabase.from('ai_gateway_requests').select('id, request_id, endpoint, provider, model, status_code, latency_ms, prompt_tokens, completion_tokens, total_tokens, error_message, created_at').eq('app_id', appId);
    if (requestId) q = q.eq('request_id', requestId);
    if (endpoint) q = q.eq('endpoint', endpoint);
    if (day) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: 'day must be YYYY-MM-DD' }, { status: 400 });
      const start = new Date(`${day}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) return NextResponse.json({ error: 'invalid day' }, { status: 400 });
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      q = q.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
    }
    const { data, error } = await q.order('created_at', { ascending: false }).limit(safeLimit);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

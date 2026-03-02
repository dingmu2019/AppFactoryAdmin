
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('appId');
    let q = supabase.from('ai_gateway_policies').select('id, app_id, default_model, allowed_models, allow_tools, allow_content_logging, max_input_tokens, max_output_tokens, daily_token_limit, daily_request_limit, created_at, updated_at').order('updated_at', { ascending: false });
    if (appId) q = q.eq('app_id', appId);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

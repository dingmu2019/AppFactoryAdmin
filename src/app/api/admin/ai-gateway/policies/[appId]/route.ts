
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const { appId } = await params;
    const body = await req.json();
    const { default_model, allowed_models, allow_tools, allow_content_logging, max_input_tokens, max_output_tokens, daily_token_limit, daily_request_limit } = body || {};
    const payload: any = { app_id: appId, default_model: typeof default_model === 'string' ? default_model : null, allowed_models: Array.isArray(allowed_models) ? allowed_models : null, allow_tools: typeof allow_tools === 'boolean' ? allow_tools : false, allow_content_logging: typeof allow_content_logging === 'boolean' ? allow_content_logging : false, max_input_tokens: typeof max_input_tokens === 'number' ? max_input_tokens : null, max_output_tokens: typeof max_output_tokens === 'number' ? max_output_tokens : null, daily_token_limit: typeof daily_token_limit === 'number' ? daily_token_limit : null, daily_request_limit: typeof daily_request_limit === 'number' ? daily_request_limit : null, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('ai_gateway_policies').upsert(payload, { onConflict: 'app_id' }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

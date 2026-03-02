
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase.from('integration_configs').select('id, config').eq('category', 'llm').eq('is_enabled', true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const models = (data || []).map((row: any) => ({ id: row.id, provider: row.config?.provider || 'openai', model: row.config?.model, baseUrl: row.config?.baseUrl || row.config?.endpoint || row.config?.url })).filter((m: any) => Boolean(m.model));
    return NextResponse.json({ data: models });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

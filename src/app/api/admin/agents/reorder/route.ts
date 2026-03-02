
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: 'IDs must be an array' }, { status: 400 });
    }

    const updates = ids.map((id, index) => ({
      id,
      sort_order: index + 1,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('ai_agents')
      .upsert(updates);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

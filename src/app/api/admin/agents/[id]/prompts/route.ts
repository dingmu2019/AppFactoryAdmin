
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { data, error } = await supabase
      .from('agent_prompts')
      .select('*')
      .eq('agent_id', id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const prompts = await req.json(); // Array of prompts

    if (!Array.isArray(prompts)) {
      return NextResponse.json({ error: 'Prompts must be an array' }, { status: 400 });
    }

    const promptsToUpsert = prompts.map(p => ({
      id: p.id,
      ...(p.id ? { id: p.id } : {}),
      agent_id: id,
      label: p.label,
      content: p.content,
      updated_at: new Date().toISOString()
    }));

    if (promptsToUpsert.length > 0) {
        const { data, error } = await supabase
        .from('agent_prompts')
        .upsert(promptsToUpsert)
        .select();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } else {
        return NextResponse.json([]);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

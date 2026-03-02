import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = (await params).token;
    if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 });

    let debate: any = null;
    let error: any = null;

    {
      const result = await supabase
        .from('agent_debates')
        .select('*')
        .eq('share_token', token)
        .is('deleted_at', null)
        .maybeSingle();
      debate = result.data;
      error = result.error;
    }

    if (error && (error as any)?.code === '42703') {
      const result = await supabase
        .from('agent_debates')
        .select('*')
        .ilike('summary', `%<!-- share_token: ${token} -->%`)
        .is('deleted_at', null)
        .maybeSingle();
      debate = result.data;
      error = result.error;
    }

    if (error || !debate) {
      return NextResponse.json({ error: 'Debate not found or link expired' }, { status: 404 });
    }

    if (debate.status !== 'completed' && debate.status !== 'terminated') {
      return NextResponse.json({ error: 'Debate not available' }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from('debate_messages')
      .select('*')
      .eq('debate_id', debate.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ ...debate, messages: messages || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Fetch Session
    const { data: session, error: sessionError } = await supabase
        .from('ai_lab_sessions')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
    
    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fetch Messages
    const { data: messages } = await supabase
        .from('ai_lab_messages')
        .select('*')
        .eq('session_id', id)
        .order('round_index', { ascending: true });

    // Fetch Artifacts
    const { data: artifacts } = await supabase
        .from('ai_lab_artifacts')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: false });

    return NextResponse.json({ session, messages, artifacts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

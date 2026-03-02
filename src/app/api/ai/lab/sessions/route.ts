
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AILabService } from '@/services/aiLabService';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
        .from('ai_lab_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, mode, description, entropy } = body;
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const session = await AILabService.createSession({
        title,
        mode,
        description,
        entropy,
        user_id: user.id
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error: any) {
    console.error('Create Session Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { supabaseAdmin as supabase } from '@/lib/supabase';

import { NextResponse } from 'next/server';
import { DebateService } from '@/services/debate/debateService';

// Helper to check if user is admin
const isAdminUser = async (supabase: any, userId: string) => {
  if (!userId) return false;
  try {
    const { data, error } = await supabase.from('users').select('roles').eq('id', userId).maybeSingle();
    if (error) {
        console.error(`[isAdminUser] Error for user ${userId}:`, error);
        return false;
    }
    if (!data) {
        // console.warn(`[isAdminUser] User ${userId} not found in public.users table`);
        return false;
    }
    return Array.isArray((data as any)?.roles) && (data as any).roles.includes('admin');
  } catch (e) {
    console.error(`[isAdminUser] Exception for user ${userId}:`, e);
    return false;
  }
};

export async function GET(request: Request) {
  
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;
  const isAdmin = await isAdminUser(supabase, userId);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('agent_debates')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { topic, mode, duration, entropy, participants_count, enable_environment_awareness, scrollMode } = body;

    const debate = await DebateService.createDebate({
        topic,
        mode,
        duration,
        entropy,
        user_id: user.id,
        participants_count,
        enable_environment_awareness: !!enable_environment_awareness,
        scroll_mode: scrollMode || 'auto'
    });
    
    // Async start
    DebateService.startDebate(debate.id).catch(err => console.error('Start debate error:', err));
    
    return NextResponse.json(debate, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


import { supabaseAdmin as supabase } from '@/lib/supabase';

import { NextResponse } from 'next/server';

// Helper to check if user is admin
const isAdminUser = async (supabase: any, userId: string) => {
  if (!userId) return false;
  try {
    const { data, error } = await supabase.from('users').select('roles').eq('id', userId).maybeSingle();
    if (error) return false;
    if (!data) return false;
    return Array.isArray((data as any)?.roles) && (data as any).roles.includes('admin');
  } catch (e) {
    return false;
  }
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  
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

  let debateQuery = supabase
    .from('agent_debates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null);

  if (!isAdmin) {
    debateQuery = debateQuery.eq('user_id', userId);
  }

  const { data: debate, error } = await debateQuery.maybeSingle();
    
  if (error) {
      console.error('Fetch debate error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  if (!debate) {
      return NextResponse.json({ error: 'Debate not found or access denied' }, { status: 404 });
  }
  
  // Fetch messages
  const { data: messages } = await supabase
    .from('debate_messages')
    .select('*')
    .eq('debate_id', id)
    .order('created_at', { ascending: true });
    
  return NextResponse.json({ ...debate, messages: messages || [] });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  
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

  const nowIso = new Date().toISOString();
  let updateQuery = supabase
    .from('agent_debates')
    .update({ deleted_at: nowIso, updated_at: nowIso })
    .eq('id', id)
    .is('deleted_at', null);
    
  if (!isAdmin) updateQuery = updateQuery.eq('user_id', userId);

  const { data, error } = await updateQuery.select('id').single();
  
  // Note: .single() returns error if no rows match
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}

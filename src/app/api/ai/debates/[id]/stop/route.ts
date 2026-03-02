
import { supabaseAdmin as supabase } from '@/lib/supabase';

import { NextResponse } from 'next/server';
import { DebateService } from '@/services/debate/debateService';

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

export async function POST(
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

  let canStopQuery = supabase
    .from('agent_debates')
    .select('id')
    .eq('id', id)
    .is('deleted_at', null);
    
  if (!isAdmin) canStopQuery = canStopQuery.eq('user_id', userId);
  
  const { data: canStop, error: canStopError } = await canStopQuery.maybeSingle();
  
  if (canStopError || !canStop) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await DebateService.stopDebate(id);
  return NextResponse.json({ success: true });
}

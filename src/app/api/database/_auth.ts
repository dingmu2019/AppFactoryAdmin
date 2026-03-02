import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function requireDatabaseAdmin(req: NextRequest): Promise<{ userId: string } | NextResponse> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase
    .from('users')
    .select('roles')
    .eq('id', user.id)
    .single();

  const isAdmin = userData?.roles?.includes('admin') || user.user_metadata?.role === 'admin';
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

  return { userId: user.id };
}


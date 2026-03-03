
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, roleId, appId } = body;
    const supabase = getSupabaseForRequest(req);
    
    let query = supabase
      .from('admin_user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);
      
    if (appId) {
      query = query.eq('app_id', appId);
    } else {
      query = query.is('app_id', null);
    }

    const { error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

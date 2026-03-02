import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const getUserId = async (req: NextRequest) => {
  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
};

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json();
    const { name, code, description, sort_order, is_active } = body || {};

    const patch: any = {};
    if (typeof name === 'string') patch.name = name.trim();
    if (typeof code === 'string' && code.trim()) patch.code = code.trim().toUpperCase();
    if (typeof description === 'string') patch.description = description;
    if (typeof sort_order === 'number') patch.sort_order = sort_order;
    if (typeof is_active === 'boolean') patch.is_active = is_active;

    const { data, error } = await supabase
      .from('prompt_categories')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const { error } = await supabase.from('prompt_categories').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


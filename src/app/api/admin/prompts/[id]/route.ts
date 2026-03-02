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
    const { title, original_content, optimized_content, tags, category_id } = body || {};

    const patch: any = {};
    if (typeof title === 'string') patch.title = title;
    if (typeof original_content === 'string') patch.original_content = original_content;
    if (typeof optimized_content === 'string') patch.optimized_content = optimized_content;
    if (Array.isArray(tags)) patch.tags = tags;
    if (typeof category_id === 'string') patch.category_id = category_id || null;

    const { data, error } = await supabase
      .from('programming_prompts')
      .update(patch)
      .eq('id', id)
      .select('*, prompt_categories(name)')
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
    const { error } = await supabase.from('programming_prompts').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


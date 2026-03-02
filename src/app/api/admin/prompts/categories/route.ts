import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const toCategoryCode = (input: string) => {
  const base = (input || '')
    .trim()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^\p{L}\p{N}_]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return base || 'CATEGORY';
};

const getUserId = async (req: NextRequest) => {
  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
};

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('prompt_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, code, description, sort_order, is_active } = body || {};
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const finalCode = typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : toCategoryCode(name);

    const { data, error } = await supabase
      .from('prompt_categories')
      .insert({
        name: name.trim(),
        code: finalCode,
        description: typeof description === 'string' ? description : undefined,
        sort_order: typeof sort_order === 'number' ? sort_order : 0,
        is_active: typeof is_active === 'boolean' ? is_active : true,
        user_id: userId,
      } as any)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


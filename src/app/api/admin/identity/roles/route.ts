
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const toRoleCode = (input: string) => {
  const base = (input || '')
    .trim()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^\p{L}\p{N}_]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return base || 'ROLE';
};

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('admin_roles')
      .select('*')
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
    const { name, code, description, is_system } = body;
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    let finalCode = typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : toRoleCode(name);
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? finalCode : `${finalCode}_${i + 1}`;
      const { count, error: existErr } = await supabase
        .from('admin_roles')
        .select('id', { count: 'exact', head: true })
        .eq('code', candidate);
      if (existErr) {
        return NextResponse.json({ error: existErr.message }, { status: 500 });
      }
      if (!count) {
        finalCode = candidate;
        break;
      }
    }

    const { data, error } = await supabase
      .from('admin_roles')
      .insert([{ name, code: finalCode, description, is_system: is_system || false }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

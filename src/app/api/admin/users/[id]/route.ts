
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { full_name, roles, status } = body;

    const { data, error } = await supabase
      .from('users')
      .update({ full_name, roles, status })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Delete from auth.users (this will cascade to public.users usually, or we do both)
    // Using admin auth client
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

    // 2. Ideally public.users row is deleted via cascade or trigger. 
    // If not, we manually delete it to be safe.
    const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (dbError) console.warn('Failed to delete public user record (might have been cascaded):', dbError.message);

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

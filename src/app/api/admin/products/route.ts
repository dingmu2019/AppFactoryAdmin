
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category_id = searchParams.get('category_id');
    const status = searchParams.get('status');
    const app_id = searchParams.get('app_id');

    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(id, name, code),
        app:saas_apps(id, name)
      `)
      .order('created_at', { ascending: false });

    if (category_id) query = query.eq('category_id', category_id);
    if (status) query = query.eq('status', status);
    if (app_id) query = query.eq('app_id', app_id);
    
    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku, name, type, price, category_id, description, status, images, stock, app_id } = body;
    
    const { data, error } = await supabase
      .from('products')
      .insert([{
        sku, name, type, price, category_id, description, status, images, stock, app_id
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

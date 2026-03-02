
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// GET /api/admin/coupons
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('app_id');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let query = supabase
      .from('coupons')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (appId) {
      query = query.eq('app_id', appId);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/coupons
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { app_id, code, type, value, min_purchase, usage_limit, start_at, end_at, description } = body;

    if (!app_id) return NextResponse.json({ error: 'app_id is required' }, { status: 400 });
    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: 'Code, type, and value are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        app_id,
        code: String(code).toUpperCase(),
        type,
        value,
        min_purchase: min_purchase || 0,
        usage_limit: usage_limit || null,
        start_at: start_at || new Date().toISOString(),
        end_at: end_at || null,
        description,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

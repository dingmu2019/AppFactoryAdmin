
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const level = searchParams.get('level');
    const search = searchParams.get('search');
    const app_id = searchParams.get('app_id');
    const resolved = searchParams.get('resolved');

    let query = supabase
      .from('system_error_logs')
      .select('*', { count: 'exact' });

    // Filters
    if (level) {
      query = query.eq('level', level);
    }
    
    if (app_id) {
      query = query.eq('app_id', app_id);
    }

    if (resolved !== null && resolved !== undefined) {
      query = query.eq('resolved', resolved === 'true');
    }

    if (search) {
      query = query.or(`message.ilike.%${search}%,path.ilike.%${search}%`);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

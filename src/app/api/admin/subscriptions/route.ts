
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// GET /api/admin/subscriptions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const appId = searchParams.get('appId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('subscriptions')
      .select('*, saas_apps(name)', { count: 'exact' });

    if (appId) {
      query = query.eq('app_id', appId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      // Try to find user IDs by email or plan keys by name
      const [usersRes, appsRes] = await Promise.all([
        supabase.from('users').select('id').ilike('email', `%${search}%`),
        supabase.from('saas_apps').select('id').ilike('name', `%${search}%`)
      ]);

      const userIds = usersRes.data?.map((u: any) => u.id) || [];
      const appIds = appsRes.data?.map((a: any) => a.id) || [];

      let orConditions = [`id.ilike.%${search}%`, `plan_key.ilike.%${search}%` ];
      if (userIds.length > 0) orConditions.push(`user_id.in.(${userIds.join(',')})`);
      if (appIds.length > 0) orConditions.push(`app_id.in.(${appIds.join(',')})`);

      query = query.or(orConditions.join(','));
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Manually fetch users
    let enrichedData = data;
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((s: any) => s.user_id))];
      const { data: users } = await supabase
        .from('users') 
        .select('id, email, full_name')
        .in('id', userIds);

      const userMap = new Map(users?.map((u: any) => [u.id, u]) || []);
      
      enrichedData = data.map((s: any) => ({
        ...s,
        user: userMap.get(s.user_id) || { email: 'Unknown', full_name: 'Unknown' }
      }));
    }

    return NextResponse.json({
      success: true,
      data: enrichedData,
      total: count,
      page,
      pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

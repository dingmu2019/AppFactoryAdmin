
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('appId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (!appId || appId === 'undefined' || appId === '') {
        return NextResponse.json({ error: 'App ID is required. Please select an application.' }, { status: 400 });
    }

    // Join with webhooks to filter by app_id
    const { data: webhooks } = await supabase
        .from('sys_webhooks')
        .select('id')
        .eq('app_id', appId);
    
    if (!webhooks || webhooks.length === 0) return NextResponse.json({ data: [], total: 0 });

    const webhookIds = webhooks.map(w => w.id);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('sys_webhook_events')
      .select('*, sys_webhooks(url)', { count: 'exact' })
      .in('webhook_id', webhookIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, total: count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

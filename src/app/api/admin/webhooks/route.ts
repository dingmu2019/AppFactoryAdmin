
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { webhookService } from '@/services/WebhookService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('appId');
    if (!appId || appId === 'undefined' || appId === '') {
        return NextResponse.json({ error: 'App ID is required. Please select an application.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('sys_webhooks')
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = await webhookService.saveConfig(body);
    return NextResponse.json({ success: true, data: config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

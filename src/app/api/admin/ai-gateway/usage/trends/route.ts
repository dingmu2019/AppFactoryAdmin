
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('appId');
    const daysRaw = searchParams.get('days') ? Number(searchParams.get('days')) : 7;
    const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(30, Math.floor(daysRaw))) : 7;
    if (!appId) return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    const { data, error } = await supabase.rpc('ai_gateway_trends', { p_app_id: appId, p_days: days });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [], days });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}


import { NextRequest, NextResponse } from 'next/server';
import { AiGatewayAlertService } from '@/services/aiGatewayAlertService';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('appId') || undefined;
    const dryRun = searchParams.get('dryRun') === 'true' || searchParams.get('dryRun') === '1';
    
    // Also check body for dryRun if not in query
    let body = {};
    try { body = await req.json(); } catch {}
    const finalDryRun = dryRun || (body as any)?.dryRun;

    const result = await AiGatewayAlertService.runOnce({ appId, dryRun: finalDryRun });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

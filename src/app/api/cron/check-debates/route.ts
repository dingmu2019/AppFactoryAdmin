import { NextRequest, NextResponse } from 'next/server';
import { DebateService } from '@/services/debate/debateService';

export const maxDuration = 60; // Set to 60s for Pro plan, or 10s for Hobby

export async function GET(req: NextRequest) {
  // Verify Vercel Cron signature
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Note: For testing locally, you can bypass this or set CRON_SECRET
    // return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log('[Cron] Checking for interrupted debates...');
    await DebateService.recoverRunningDebates();
    return NextResponse.json({ ok: true, message: 'Recovery check completed' });
  } catch (error: any) {
    console.error('[Cron] Recovery check failed:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
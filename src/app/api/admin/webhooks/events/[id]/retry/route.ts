
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { webhookService } from '@/services/WebhookService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Reset status to pending and retry time to now
    const { error } = await supabase
        .from('sys_webhook_events')
        .update({ status: 0, next_retry_at: new Date().toISOString() })
        .eq('id', id);
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Trigger worker immediately
    webhookService.processPendingEvents().catch(console.error);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

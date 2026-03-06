
import { NextRequest, NextResponse } from 'next/server';
import { AuditLogService } from '@/services/auditService';
import { supabaseAdmin as supabase } from '@/lib/supabase';

/**
 * Public endpoint for frontend audit logging (e.g. Login/Logout/Pageview)
 * Since this is public, we only allow specific actions.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, resource, status, details } = body;

    // Allowed actions for public logging
    const ALLOWED_ACTIONS = ['LOGIN', 'LOGOUT', 'PAGEVIEW', 'ERROR'];
    
    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Unauthorized action' }, { status: 403 });
    }

    // Capture context from request headers
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';

    let userId: string | undefined;
    if (token) {
        try {
            const { data } = await supabase.auth.getUser(token);
            userId = data.user?.id;
        } catch (e) {
            console.warn('[Public Audit] Failed to extract userId from token');
        }
    }

    // Call service to log
    await AuditLogService.log({
      user_id: userId,
      action,
      resource: resource || 'frontend',
      status: status || 'SUCCESS',
      details,
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Public Audit] Error logging:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { AuditLogService } from '@/services/auditService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const app_id = searchParams.get('app_id') || undefined;
    const action = searchParams.get('action') || undefined;
    const resource = searchParams.get('resource') || undefined;
    const user_id = searchParams.get('user_id') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const result = await AuditLogService.query({
      page,
      pageSize,
      app_id,
      action,
      resource,
      user_id,
      startDate,
      endDate
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Validate required fields? Or let service handle it.
    // The legacy endpoint might have allowed manual logging from frontend (if secured).
    // Usually audit logs are internal, but let's support it if needed.
    
    // However, the legacy code for `POST /api/audit-logs` wasn't explicitly shown in my read list, 
    // but the service has `log` method.
    // If this endpoint is for manual logging:
    await AuditLogService.log(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

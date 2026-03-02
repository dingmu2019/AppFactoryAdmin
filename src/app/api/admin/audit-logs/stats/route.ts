
import { NextRequest, NextResponse } from 'next/server';
import { AuditLogService } from '@/services/auditService';

export async function GET(req: NextRequest) {
  try {
    const stats = await AuditLogService.getStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

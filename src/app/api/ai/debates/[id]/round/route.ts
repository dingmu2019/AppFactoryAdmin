import { NextRequest, NextResponse } from 'next/server';
import { DebateService } from '@/services/debate/debateService';
import { withApiErrorHandling } from '@/lib/api-wrapper';

export const POST = withApiErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    
    // Process exactly one round
    const result = await DebateService.processNextRound(id);
    
    return NextResponse.json(result);
});

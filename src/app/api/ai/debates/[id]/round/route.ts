import { NextRequest, NextResponse } from 'next/server';
import { DebateService } from '@/services/debate/debateService';
import { withApiErrorHandling } from '@/lib/api-wrapper';
import { getSupabaseForRequest } from '@/lib/supabase';

export const POST = withApiErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    
    // 1. Auth Check: Ensure user is logged in and has access to this debate
    const supabase = getSupabaseForRequest(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if debate exists and user has access (RLS will handle this if we use the user-scoped client)
    const { data: debate, error } = await supabase
        .from('agent_debates')
        .select('id')
        .eq('id', id)
        .single();
        
    if (error || !debate) {
        return NextResponse.json({ error: 'Debate not found or access denied' }, { status: 404 });
    }
    
    // 2. Process exactly one round (using the Service Role inside the service for complex logic)
    const result = await DebateService.processNextRound(id);
    
    return NextResponse.json(result);
});

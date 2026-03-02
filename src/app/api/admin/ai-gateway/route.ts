
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// Helper function
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// POST /api/admin/ai-gateway (just a placeholder if needed, currently not used)
// We only need to implement specific routes for AI Gateway

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'AI Gateway API' });
}

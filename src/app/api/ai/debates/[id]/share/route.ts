
import { supabaseAdmin as supabase } from '@/lib/supabase';

import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Helper to check if user is admin
const isAdminUser = async (supabase: any, userId: string) => {
  if (!userId) return false;
  try {
    const { data, error } = await supabase.from('users').select('roles').eq('id', userId).maybeSingle();
    if (error) return false;
    if (!data) return false;
    return Array.isArray((data as any)?.roles) && (data as any).roles.includes('admin');
  } catch (e) {
    return false;
  }
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;
  const isAdmin = await isAdminUser(supabase, userId);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

  // Verify ownership
  let query = supabase
    .from('agent_debates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null);
  
  if (!isAdmin) {
      query = query.eq('user_id', userId);
  }
  
  const { data: debate, error } = await query.maybeSingle();
  
  if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  
  if (!debate) {
      return NextResponse.json({ error: 'Debate not found or access denied' }, { status: 404 });
  }
  
  if (debate.status !== 'completed' && debate.status !== 'terminated') {
      return NextResponse.json({ error: `Only completed or terminated debates can be shared. Current status: ${debate.status}` }, { status: 400 });
  }

  const existingTokenFromColumn = (debate as any)?.share_token as string | undefined;
  if (existingTokenFromColumn) {
    return NextResponse.json({
      token: existingTokenFromColumn,
      url: `${baseUrl}/share/debate/${existingTokenFromColumn}`,
      topic: debate.topic,
    });
  }

  const summaryText = typeof debate.summary === 'string' ? debate.summary : '';
  const tokenMatch = summaryText ? /<!--\s*share_token:\s*([a-f0-9-]+)\s*-->/.exec(summaryText) : null;
  if (tokenMatch) {
    const existingToken = tokenMatch[1];
    return NextResponse.json({
      token: existingToken,
      url: `${baseUrl}/share/debate/${existingToken}`,
      topic: debate.topic,
    });
  }

  // Generate new token
  const newToken = crypto.randomUUID();
  
  // Check if share_token column exists by checking properties (simplistic check, in real app we assume schema)
  // We'll just try to update it if it's in the type definition or fallback to summary hack
  // For now, let's assume the column exists as per recent migrations, or use the summary hack as fallback
  
  const hasShareTokenColumn = true; // Assuming schema is updated
  const updatePayload = hasShareTokenColumn
    ? { share_token: newToken }
    : { summary: (summaryText || '') + `\n\n<!-- share_token: ${newToken} -->` };

  const { error: updateError } = await supabase.from('agent_debates').update(updatePayload as any).eq('id', id);
    
  if (updateError) {
      // If column doesn't exist error, fallback to summary hack
      if (updateError.message.includes('column "share_token" of relation "agent_debates" does not exist')) {
          const { error: retryError } = await supabase.from('agent_debates').update({ 
              summary: (summaryText || '') + `\n\n<!-- share_token: ${newToken} -->` 
          }).eq('id', id);
          if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
      } else {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
  }

  return NextResponse.json({
    token: newToken,
    url: `${baseUrl}/share/debate/${newToken}`,
    topic: debate.topic,
  });
}

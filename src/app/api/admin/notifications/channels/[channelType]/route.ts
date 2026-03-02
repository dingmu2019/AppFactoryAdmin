
import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/services/notification/notificationService';
import { ChannelType } from '@/services/notification/types';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: Promise<{ channelType: string }> }) {
  try {
    // Basic Auth Check
    const auth = req.headers.get('authorization') || '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Check if user is admin
    const roles = (userData.user.app_metadata?.roles || userData.user.user_metadata?.roles || []) as string[];
    if (!roles.includes('admin')) {
      const { data: dbUser } = await supabase.from('users').select('roles').eq('id', userData.user.id).single();
      if (!dbUser?.roles?.includes('admin')) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const { channelType } = await params;
    const body = await req.json();
    
    const input = {
      ...body,
      channelType: channelType as ChannelType
    };

    const result = await NotificationService.upsertChannelConfig(input);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

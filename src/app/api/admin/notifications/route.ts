
import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/services/notification/notificationService';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
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
      // Fallback: check database if not in metadata
      const { data: dbUser } = await supabase.from('users').select('roles').eq('id', userData.user.id).single();
      if (!dbUser?.roles?.includes('admin')) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    console.log('GET /api/admin/notifications called');
    const overview = await NotificationService.getOverview();
    return NextResponse.json(overview);
  } catch (error: any) {
    console.error('Error fetching notification overview:', error);
    return NextResponse.json({ 
      error: error.message,
      code: error.code
    }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const { data, error } = await supabase
    .from('saas_apps')
    .select('api_key, api_secret')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: 'App not found' }, { status: 404 });
  
  return NextResponse.json(data);
}

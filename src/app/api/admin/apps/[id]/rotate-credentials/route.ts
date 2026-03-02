
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import crypto from 'crypto';

// Helper to generate keys
const generateCredentials = () => {
  const apiKey = 'pk_' + crypto.randomBytes(16).toString('hex');
  const apiSecret = 'sk_' + crypto.randomBytes(24).toString('hex');
  return { apiKey, apiSecret };
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { apiKey, apiSecret } = generateCredentials();

  const { data, error } = await supabase
    .from('saas_apps')
    .update({ 
      api_key: apiKey, 
      api_secret: apiSecret 
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to rotate credentials' }, { status: 500 });
  return NextResponse.json(data);
}

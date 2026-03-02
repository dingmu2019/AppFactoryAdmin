
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    // 1. Verify Code from DB
    const { data: validCode, error: codeError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (codeError || !validCode) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // 2. Delete used code
    await supabaseAdmin.from('verification_codes').delete().eq('id', validCode.id);

    // 3. Generate Supabase Auth Session (Magic Link Token)
    // We generate a magic link token that the client can use to exchange for a session via verifyOtp
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Failed to generate auth link:', linkError);
      return NextResponse.json({ error: 'Failed to generate session token' }, { status: 500 });
    }

    // 4. Return the token hash to client
    return NextResponse.json({ 
        success: true, 
        message: 'Login successful',
        token: linkData.properties.hashed_token,
        type: 'magiclink' 
    });

  } catch (error: any) {
    console.error('Login with code error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

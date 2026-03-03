
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { withApiErrorHandling } from '@/lib/api-wrapper';

export const POST = withApiErrorHandling(async (req: NextRequest) => {
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

    // 3. Check if user exists and create or update
    // Note: Use getSupabaseAdmin() directly to avoid proxy binding issues with nested auth.admin calls
    const admin = getSupabaseAdmin();
    let existingUser = null;
    
    try {
      const { data: publicUser } = await admin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (publicUser) {
        const { data: authUser } = await admin.auth.admin.getUserById(publicUser.id);
        existingUser = authUser.user;
      }
    } catch (e) {
      // Not found or error
    }

    if (!existingUser) {
        const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
        if (!listError && usersData) {
            existingUser = usersData.users.find(u => u.email === email);
        }
    }

    if (!existingUser) {
      // 用户不存在，创建新用户
      console.log(`[Login] Creating new user: ${email}`);
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password: code,
        email_confirm: true,
        user_metadata: { role: 'user' }
      });

      if (createError) {
        console.error('Failed to create user:', createError);
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
      }
      
      if (newUser.user) {
          await admin.from('users').upsert({
              id: newUser.user.id,
              email: email,
              full_name: email.split('@')[0],
              roles: ['user'],
              status: 'active'
          }, { onConflict: 'id' });
      }
    } else {
      // 用户已存在，更新其密码为当前 code
      console.log(`[Login] Updating existing user: ${email}`);
      const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password: code,
        user_metadata: { ...existingUser.user_metadata, role: existingUser.user_metadata?.role || 'user' }
      });

      if (updateError) {
        console.error('Failed to update user password:', updateError);
        return NextResponse.json({ error: 'Failed to update user security credentials' }, { status: 500 });
      }
    }

    // 4. Generate Supabase Auth Session (Magic Link Token)
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
});

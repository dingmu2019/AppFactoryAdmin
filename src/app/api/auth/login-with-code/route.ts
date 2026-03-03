
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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
    // 获取所有用户并查找匹配邮箱的用户
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Failed to list users:', listError);
      return NextResponse.json({ error: 'Failed to verify user status' }, { status: 500 });
    }

    const existingUser = usersData.users.find(u => u.email === email);

    if (!existingUser) {
      // 用户不存在，创建新用户
      // password 设置为 code，确认邮箱，设置元数据角色为 user
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: code,
        email_confirm: true,
        user_metadata: { role: 'user' }
      });

      if (createError) {
        console.error('Failed to create user:', createError);
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
      }
    } else {
      // 用户已存在，更新其密码为当前 code
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: code
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

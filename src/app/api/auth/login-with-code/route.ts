
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, supabaseAdmin } from '@/lib/supabase';
import { withApiErrorHandling } from '@/lib/api-wrapper';
import { AuditLogService } from '@/services/auditService';

export const POST = withApiErrorHandling(async (req: NextRequest) => {
    const body = await req.json();
    const { email, code } = body;
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    // Record Login Attempt
    const logAttempt = async (status: 'SUCCESS' | 'FAILURE', errorMsg?: string, userId?: string) => {
        await AuditLogService.log({
            user_id: userId,
            action: 'LOGIN',
            resource: 'auth',
            status,
            details: { email, method: 'code', error: errorMsg, app_id: 'AdminSys_app' },
            ip_address: ip,
            user_agent: userAgent
        });
    };

    // 1. Verify Code from DB
    const { data: validCode, error: codeError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (codeError || !validCode) {
      await logAttempt('FAILURE', 'Invalid or expired code');
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // 2. Delete used code
    await supabaseAdmin.from('verification_codes').delete().eq('id', validCode.id);

    // 3. Check if user exists and create or update
    // Note: Use getSupabaseAdmin() directly to avoid proxy binding issues with nested auth.admin calls
    const admin = getSupabaseAdmin();
    let existingUser = null;
    
    try {
      // 优先从 public.users 查找，确保业务表同步
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
      // 不存在或查询失败
    }

    if (!existingUser) {
        // 如果业务表没找到，从 Auth 系统全局查找
        const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
        if (!listError && usersData) {
            existingUser = usersData.users.find(u => u.email === email);
        }
    }

    if (!existingUser) {
      // 用户完全不存在，执行【创建】流程
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
      
      existingUser = newUser.user;
    } else {
      // 用户已存在，执行【密码同步】流程
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

    // --- 核心修复点：无论新建还是更新，都强制同步一次 public.users 记录，并增加会话版本用于踢出 ---
    if (existingUser) {
        console.log(`[Login] Synchronizing public.users and incrementing session version for: ${email}`);
        
        // 1. 调用 RPC 增加版本号并同步到元数据
        const { data: newVersion, error: rpcError } = await admin.rpc('increment_session_version', { 
            target_user_id: existingUser.id 
        });

        if (rpcError) {
            console.error('[Login] Failed to increment session version via RPC:', rpcError);
            // 降级逻辑：如果 RPC 失败，至少尝试 upsert 基础数据
            await admin.from('users').upsert({
                id: existingUser.id,
                email: email,
                full_name: email.split('@')[0],
                roles: ['user'],
                status: 'active'
            }, { onConflict: 'id' });
        } else {
            console.log(`[Login] New session version for ${email}: ${newVersion}`);
        }
    }
    // -------------------------------------------------------------------

    // 4. Generate Supabase Auth Session (Magic Link Token)
    // 注意：这里也改用 admin 实例调用以防 this 丢失
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Failed to generate auth link:', linkError);
      return NextResponse.json({ error: 'Failed to generate session token' }, { status: 500 });
    }

    await logAttempt('SUCCESS', undefined, existingUser?.id);

    // 4. Return the token hash to client
    return NextResponse.json({ 
        success: true, 
        message: 'Login successful',
        token: linkData.properties.hashed_token,
        type: 'magiclink' 
    });
});

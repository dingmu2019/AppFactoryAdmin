
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '../../services/emailService.ts';
import { signAppUserToken, requireAppUser } from '../../middleware/appAuth.ts';
import { AuditLogService } from '../../services/auditService.ts';

const router = express.Router();

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to generate 8-char mixed case alphanumeric code
function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * @openapi
 * /api/v1/auth/send-code:
 *   post:
 *     summary: Send verification code to email
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Code sent successfully
 *       400:
 *         description: Missing email
 */
router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Optional: Check if email is blacklisted for this App
    // const appId = req.currentApp?.id;

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store in DB
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        email,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error('DB Error:', dbError);
      // Fallback to memory is skipped for V1 API to ensure statelessness/reliability
      return res.status(500).json({ error: 'Failed to generate code' });
    }

    // Send Email
    // TODO: Use App-specific email template if configured
    await EmailService.sendVerificationCode(email, code);

    res.json({ success: true, message: 'Verification code sent' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with verification code
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                   description: Scoped App User Token
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     app_id:
 *                       type: string
 *                 expires_in:
 *                   type: integer
 */
router.post('/login', async (req, res) => {
  try {
    const { email, code } = req.body;
    const appId = req.currentApp?.id;

    if (!appId) {
      return res.status(500).json({ error: 'App Context not found' });
    }
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    // 1. Verify Code
    const { data: codes, error: dbError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (dbError || !codes || codes.length === 0) {
      void AuditLogService.log({
        app_id: appId,
        action: 'LOGIN',
        resource: 'auth',
        status: 'FAILURE',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        details: { channel: 'email_code', email, reason: 'Invalid or expired verification code' }
      });
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Mark as used
    await supabase
      .from('verification_codes')
      .update({ is_used: true })
      .eq('id', codes[0].id);

    // 2. Find or Create Global User
    // We use email as the identifier.
    // If user exists, we link them. If not, we create them.
    const username = email.split('@')[0];
    
    // Check if user exists by email
    // Admin API 'listUsers' is not efficient for single lookup, but 'createUser' handles duplicates.
    // However, 'createUser' returns error if exists.
    
    let userId = '';
    
    // Try to get user by email first (Need to use listUsers with filter)
    // Supabase Admin API: listUsers({ email: ... }) doesn't exist directly in older versions?
    // Actually createUser handles it if we catch the error, OR we use a dedicated function.
    // Let's try to create.
    
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { 
             full_name: username,
             source_app_id: appId,
             app_id: appId // Pass both to satisfy different trigger versions
         }
    });

    if (createError) {
        // Check if user already exists
        // Error message usually contains "already registered"
        if (createError.message.includes('already registered') || createError.status === 422) {
            // Fetch existing user ID?
            // Since we can't easily get ID from "already registered" error without another call...
            // We can query the 'users' table directly via Supabase Client (if we have access to public.users or auth.users view)
            // But usually we can't query auth.users directly via Client unless we use RPC or direct DB access.
            // WORKAROUND: For now, we assume we can query `public.users` if there is a trigger that syncs auth.users to public.users?
            // The project seems to use `public.users` in `user_app_relations`.
            // Let's check if public.users exists and is synced.
            // Based on migrations, public.users is referenced.
            
            const { data: existingUsers, error: searchError } = await supabase
                .from('users') // Assuming public.users is synced with auth.users
                .select('id')
                .eq('email', email)
                .single();
            
            if (searchError || !existingUsers) {
                // If not in public.users, maybe sync failed or not set up.
                // Try to use listUsers from admin api
                 const { data: listData } = await supabase.auth.admin.listUsers();
                 // This is bad for performance.
                 // Better: We should have a way to get user.
                 // Let's assume public.users IS the way.
                 return res.status(500).json({ error: 'User exists but could not be retrieved from public records.' });
            }
            userId = existingUsers.id;
        } else {
            throw createError;
        }
    } else {
        userId = createdUser.user.id;
    }

    // 2.1 Ensure user profile exists and persist registration source (source_app_id)
    // - 用户在所有应用中通用：userId 全局唯一
    // - 注册来源：只记录首次注册来源，不覆盖已有 source_app_id
    const nowIso = new Date().toISOString();
    const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('id, source_app_id')
        .eq('id', userId)
        .maybeSingle();
    if (profileErr) {
        throw profileErr;
    }
    if (!profile) {
        const { error: upsertErr } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email,
                full_name: username,
                source_app_id: appId,
                last_sign_in_at: nowIso
            }, { onConflict: 'id' });
        if (upsertErr) throw upsertErr;
    } else {
        if (!profile.source_app_id) {
            const { error: setSourceErr } = await supabase
                .from('users')
                .update({ source_app_id: appId })
                .eq('id', userId);
            if (setSourceErr) throw setSourceErr;
        }
        const { error: signInErr } = await supabase
            .from('users')
            .update({ last_sign_in_at: nowIso })
            .eq('id', userId);
        if (signInErr) throw signInErr;
    }

    // 3. Ensure User-App Relation
    const { error: relationError } = await supabase
        .from('user_app_relations')
        .upsert({
            user_id: userId,
            app_id: appId,
            last_active_at: new Date().toISOString()
        }, { onConflict: 'user_id, app_id' });

    if (relationError) {
        throw relationError;
    }

    // 4. Sign Scoped Token
    const token = signAppUserToken({ id: userId, email }, appId);

    void AuditLogService.log({
      user_id: userId,
      app_id: appId,
      action: 'LOGIN',
      resource: 'auth',
      status: 'SUCCESS',
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      details: { channel: 'email_code', email }
    });

    res.json({
        success: true,
        token,
        user: {
            id: userId,
            email,
            app_id: appId
        },
        expires_in: 7 * 24 * 3600
    });

  } catch (error: any) {
    console.error('[auth][login] error', error);
    try {
      const appId = req.currentApp?.id;
      if (appId) {
        void AuditLogService.log({
          app_id: appId,
          action: 'LOGIN',
          resource: 'auth',
          status: 'FAILURE',
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          details: { channel: 'email_code', email: req.body?.email, reason: error?.message || 'Login failed' }
        });
      }
    } catch {}
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user info
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/me', requireAppUser, async (req, res) => {
    try {
        const userId = req.appUser?.sub;
        const appId = req.appUser?.app_id;

        // Fetch user info from public.users and user_app_relations
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                id, email, full_name, avatar_url,
                user_app_relations!inner (
                    vip_level, points, tags, custom_data
                )
            `)
            .eq('id', userId)
            .eq('user_app_relations.app_id', appId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        res.json({ data: user });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /api/v1/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [new_password]
 *             properties:
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 */
router.post('/change-password', requireAppUser, async (req, res) => {
    try {
        const userId = req.appUser?.sub;
        const appId = req.currentApp?.id || req.appUser?.app_id;
        const newPassword = req.body?.new_password || req.body?.newPassword;

        if (!appId) {
            return res.status(500).json({ error: 'App Context not found' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (typeof newPassword !== 'string') {
            return res.status(400).json({ error: 'new_password is required' });
        }
        const trimmed = newPassword.trim();
        if (trimmed.length < 8) {
            return res.status(400).json({ error: 'Password too short (min 8 characters)' });
        }
        if (trimmed.length > 72) {
            return res.status(400).json({ error: 'Password too long (max 72 characters)' });
        }

        const { error } = await supabase.auth.admin.updateUserById(userId, { password: trimmed });
        if (error) {
            void AuditLogService.log({
                user_id: userId,
                app_id: appId,
                action: 'PASSWORD_CHANGE',
                resource: 'auth',
                status: 'FAILURE',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                details: { channel: 'app_token', reason: error.message }
            });
            return res.status(400).json({ error: error.message });
        }

        void AuditLogService.log({
            user_id: userId,
            app_id: appId,
            action: 'PASSWORD_CHANGE',
            resource: 'auth',
            status: 'SUCCESS',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            details: { channel: 'app_token' }
        });

        return res.json({ success: true });
    } catch (err: any) {
        const userId = req.appUser?.sub;
        const appId = req.currentApp?.id || req.appUser?.app_id;
        if (appId) {
            void AuditLogService.log({
                user_id: userId,
                app_id: appId,
                action: 'PASSWORD_CHANGE',
                resource: 'auth',
                status: 'FAILURE',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                details: { channel: 'app_token', reason: err?.message || 'Change password failed' }
            });
        }
        return res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
});

export default router;

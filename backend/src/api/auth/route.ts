
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { EmailService } from '../../services/emailService.ts';
import { MessageService } from '../../services/message/MessageService.ts';
import { AuditLogService } from '../../services/auditService.ts';
import { NotificationService } from '../../services/notification/notificationService.ts';

dotenv.config();

const router = express.Router();

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const supabaseAuthCheck = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

// In-memory storage for verification codes (Fallback if DB table is missing)
const memoryVerificationCodes = new Map<string, { code: string, expiresAt: number }>();

// Helper to generate 8-char mixed case alphanumeric code
function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function evaluatePasswordPolicy(input: { email?: string; newPassword: string }) {
  const errors: string[] = [];
  const pwd = input.newPassword;

  if (typeof pwd !== 'string') return ['Password is required'];
  if (pwd.trim() !== pwd) errors.push('Password must not start or end with whitespace');
  if (/\s/.test(pwd)) errors.push('Password must not contain whitespace');
  if (pwd.length < 12) errors.push('Password too short (min 12 characters)');
  if (pwd.length > 72) errors.push('Password too long (max 72 characters)');

  const lower = /[a-z]/.test(pwd);
  const upper = /[A-Z]/.test(pwd);
  const digit = /\d/.test(pwd);
  const special = /[^a-zA-Z0-9]/.test(pwd);
  const categories = [lower, upper, digit, special].filter(Boolean).length;
  if (categories < 3) errors.push('Password must include at least 3 types: lower/upper/number/special');

  const email = input.email;
  if (email && typeof email === 'string') {
    const local = email.split('@')[0] || '';
    if (local && local.length >= 3) {
      const localLower = local.toLowerCase();
      if (pwd.toLowerCase().includes(localLower)) errors.push('Password must not contain email prefix');
    }
  }

  return errors;
}

/**
 * @openapi
 * /api/auth/send-code:
 *   post:
 *     tags: [Auth]
 *     summary: Send verification code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code sent
 */
router.post('/send-code', async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log('[auth][send-code] request', { email, ip: req.ip });
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Try to store in DB first, fallback to memory
    try {
        const { error: dbError } = await supabase
        .from('verification_codes')
        .insert({
            email,
            code,
            expires_at: expiresAt.toISOString(),
        });
        
        if (dbError) throw dbError;
    } catch (err) {
        console.warn('DB Error (verification_codes), falling back to memory:', err);
        memoryVerificationCodes.set(email, { code, expiresAt: expiresAt.getTime() });
    }

    try {
      await NotificationService.sendTest('email', email, 'login_verification', { code, ttlMinutes: 5 });
    } catch {
      await EmailService.sendVerificationCode(email, code);
    }

    console.log('[auth][send-code] sent', { email });
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error: any) {
    console.error('[auth][send-code] error', { email: req.body?.email, message: error?.message });
    next(error);
  }
});

/**
 * @openapi
 * /api/auth/login-with-code:
 *   post:
 *     tags: [Auth]
 *     summary: Login with code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login success
 */
router.post('/login-with-code', async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ error: 'Email and code are required' });
      return;
    }

    let isValid = false;

    // 1. Try DB Verification
    const { data: codes, error: dbError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (!dbError && codes && codes.length > 0) {
        isValid = true;
        // Mark as used
        await supabase
          .from('verification_codes')
          .update({ is_used: true })
          .eq('id', codes[0].id);
    } else {
        // 2. Try Memory Verification
        const memCode = memoryVerificationCodes.get(email);
        if (memCode && memCode.code === code && memCode.expiresAt > Date.now()) {
            isValid = true;
            memoryVerificationCodes.delete(email); // Mark as used
        }
    }

    if (!isValid) {
      res.status(400).json({ error: 'Invalid or expired verification code' });
      return;
    }

    const username = email.split('@')[0];

    // Generate Supabase Session Link (Magic Link)
    // We use generateLink to get a token that the frontend can exchange for a session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError || !linkData.properties?.action_link) {
      console.error('Generate Link Error:', linkError);
      res.status(500).json({ error: 'Failed to generate session' });
      return;
    }

    // Parse the token from the action_link
    // Link format: site_url/auth/v1/verify?token=...&type=magiclink&redirect_to=...
    // We need the 'token' param.
    const actionLink = linkData.properties.action_link;
    const url = new URL(actionLink);
    const token = url.searchParams.get('token'); // This is the PKCE token hash or token
    const type = url.searchParams.get('type');

    if (!token) {
       res.status(500).json({ error: 'Failed to retrieve session token' });
       return;
    }

    const isUuid = (value: string | null | undefined) =>
      !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    const adminSysAppId = (await AuditLogService.getAdminSysAppId()) || null;
    const sourceAppId = isUuid(adminSysAppId) ? adminSysAppId : null;
    const userId = linkData.user?.id || null;

    if (userId) {
      try {
        await supabase
          .from('users')
          .upsert(
            {
              id: userId,
              email: email,
              full_name: username,
              roles: ['user'],
              source_app_id: sourceAppId,
              last_sign_in_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
          );
      } catch {}

      try {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { full_name: username, role: 'user' }
        });
      } catch {}
    }

    // Audit Log for Code Login
    await AuditLogService.log({
        user_id: userId || undefined,
        // user_email: email, // Removed
        action: 'LOGIN',
        resource: 'auth',
        app_id: adminSysAppId || 'AdminSys_app',
        status: 'SUCCESS',
        details: { method: 'code_login', email } // Put email in details if needed for debugging
    });

    // Return the token to frontend
    res.json({ 
      success: true, 
      token,
      type 
    });

  } catch (error: any) {
    next(error);
  }
});

/**
 * @openapi
 * /api/auth/change-password:
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
 *               current_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 */
router.post('/change-password', async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  const { current_password, currentPassword, new_password, newPassword } = req.body || {};
  const currentPwd = (typeof current_password === 'string' ? current_password : typeof currentPassword === 'string' ? currentPassword : '').trim();
  const nextPwd = (typeof new_password === 'string' ? new_password : typeof newPassword === 'string' ? newPassword : '').trim();

  const adminSysAppId = (await AuditLogService.getAdminSysAppId()) || 'AdminSys_app';

  try {
    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    if (!nextPwd) {
      return res.status(400).json({ error: 'new_password is required' });
    }

    const { data, error: userErr } = await supabaseAuthCheck.auth.getUser(token);
    if (userErr || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const email = data.user.email || '';
    const policyErrors = evaluatePasswordPolicy({ email, newPassword: nextPwd });
    if (policyErrors.length) {
      return res.status(400).json({ error: policyErrors[0], details: policyErrors });
    }

    if (currentPwd) {
      const { error: signInErr } = await supabaseAuthCheck.auth.signInWithPassword({ email, password: currentPwd });
      if (signInErr) {
        void AuditLogService.log({
          user_id: data.user.id,
          app_id: adminSysAppId,
          action: 'PASSWORD_CHANGE',
          resource: 'auth',
          status: 'FAILURE',
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          details: { method: 'password_change', has_current_password: true, reason: 'Invalid current password' }
        });
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(data.user.id, { password: nextPwd });
    if (updateErr) {
      void AuditLogService.log({
        user_id: data.user.id,
        app_id: adminSysAppId,
        action: 'PASSWORD_CHANGE',
        resource: 'auth',
        status: 'FAILURE',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        details: { method: 'password_change', has_current_password: !!currentPwd, reason: updateErr.message }
      });
      return res.status(400).json({ error: updateErr.message });
    }

    void AuditLogService.log({
      user_id: data.user.id,
      app_id: adminSysAppId,
      action: 'PASSWORD_CHANGE',
      resource: 'auth',
      status: 'SUCCESS',
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      details: { method: 'password_change', has_current_password: !!currentPwd }
    });

    return res.json({ success: true });
  } catch (err: any) {
    try {
      void AuditLogService.log({
        user_id: req.user?.id,
        app_id: adminSysAppId,
        action: 'PASSWORD_CHANGE',
        resource: 'auth',
        status: 'FAILURE',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        details: { method: 'password_change', has_current_password: !!currentPwd, reason: err?.message || 'Change password failed' }
      });
    } catch {}
    next(err);
  }
});

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', async (req, res, next) => {
  try {
    const { app_id, email } = req.body;
    
    // We expect the auth token to be valid (checked by extractUser middleware if applied, or simple JWT check)
    // Here we just log the event as requested.
    
    await AuditLogService.log({
      user_id: req.user?.id, // Extracted from token by middleware
      // user_email: email, // Removed
      action: 'LOGOUT',
      resource: 'auth',
      app_id: (await AuditLogService.resolveAppId(app_id)) || (await AuditLogService.getAdminSysAppId()) || app_id,
      status: 'SUCCESS',
      details: { method: 'manual_logout', email } // Put email in details
    });

    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;

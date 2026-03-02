
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AuditLogService } from '@/services/auditService';

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

export async function POST(req: NextRequest) {
  const adminSysAppId = (await AuditLogService.getAdminSysAppId()) || 'AdminSys_app';
  let userId: string | undefined;
  let ipAddress: string | undefined;
  let userAgent: string | undefined;

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
    const body = await req.json();
    const { current_password, currentPassword, new_password, newPassword } = body || {};
    const currentPwd = (typeof current_password === 'string' ? current_password : typeof currentPassword === 'string' ? currentPassword : '').trim();
    const nextPwd = (typeof new_password === 'string' ? new_password : typeof newPassword === 'string' ? newPassword : '').trim();

    ipAddress = req.headers.get('x-forwarded-for') || undefined;
    userAgent = req.headers.get('user-agent') || undefined;

    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }
    if (!nextPwd) {
      return NextResponse.json({ error: 'new_password is required' }, { status: 400 });
    }

    const { data, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !data?.user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    userId = data.user.id;
    const email = data.user.email || '';
    const policyErrors = evaluatePasswordPolicy({ email, newPassword: nextPwd });
    if (policyErrors.length) {
      return NextResponse.json({ error: policyErrors[0], details: policyErrors }, { status: 400 });
    }

    if (currentPwd) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPwd });
      if (signInErr) {
        await AuditLogService.log({
          user_id: userId,
          app_id: adminSysAppId,
          action: 'PASSWORD_CHANGE',
          resource: 'auth',
          status: 'FAILURE',
          ip_address: ipAddress,
          user_agent: userAgent,
          details: { method: 'password_change', has_current_password: true, reason: 'Invalid current password' }
        });
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, { password: nextPwd });
    if (updateErr) {
      await AuditLogService.log({
        user_id: userId,
        app_id: adminSysAppId,
        action: 'PASSWORD_CHANGE',
        resource: 'auth',
        status: 'FAILURE',
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { method: 'password_change', has_current_password: !!currentPwd, reason: updateErr.message }
      });
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    await AuditLogService.log({
      user_id: userId,
      app_id: adminSysAppId,
      action: 'PASSWORD_CHANGE',
      resource: 'auth',
      status: 'SUCCESS',
      ip_address: ipAddress,
      user_agent: userAgent,
      details: { method: 'password_change', has_current_password: !!currentPwd }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    try {
      await AuditLogService.log({
        user_id: userId,
        app_id: adminSysAppId,
        action: 'PASSWORD_CHANGE',
        resource: 'auth',
        status: 'FAILURE',
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { method: 'password_change', has_current_password: false, reason: err?.message || 'Change password failed' }
      });
    } catch {}
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

const apiBaseUrl = process.env.VITE_API_URL || 'http://localhost:3001';
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const frontendEnv = fs.readFileSync('frontend/.env', 'utf8');
const anonKey = frontendEnv
  .split('\n')
  .find(line => line.startsWith('VITE_SUPABASE_ANON_KEY='))
  ?.split('=')[1];

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error('Missing supabase env. Need VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);
const anon = createClient(supabaseUrl, anonKey);

async function mustJson(resp) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function runOnce(email) {
  console.log('\n=== Code Login Selfcheck ===');
  console.log('email:', email);

  const sendResp = await fetch(`${apiBaseUrl}/api/auth/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const sendJson = await mustJson(sendResp);
  console.log('send-code:', sendResp.status, sendJson);
  if (!sendResp.ok) return { ok: false, stage: 'send-code' };

  const { data: codes, error: codeErr } = await admin
    .from('verification_codes')
    .select('code, created_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (codeErr) {
    console.log('verification_codes query error:', codeErr.message);
    return { ok: false, stage: 'read-code' };
  }

  const code = codes?.[0]?.code;
  console.log('codeFromDb:', code);
  if (!code) return { ok: false, stage: 'read-code' };

  const loginResp = await fetch(`${apiBaseUrl}/api/auth/login-with-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  const loginJson = await mustJson(loginResp);
  console.log('login-with-code:', loginResp.status, loginJson);
  if (!loginResp.ok) return { ok: false, stage: 'login-with-code' };

  const tokenHash = loginJson.token;
  const type = loginJson.type || 'magiclink';
  if (!tokenHash) return { ok: false, stage: 'token-hash' };

  const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
    token_hash: tokenHash,
    type
  });
  if (verifyError) {
    console.log('verifyOtp error:', verifyError.message);
    return { ok: false, stage: 'verifyOtp' };
  }

  console.log('verifyOtp ok:', { userId: verifyData.user?.id, hasSession: !!verifyData.session });
  return { ok: true };
}

const mode = process.argv[2] || 'existing';
const email =
  mode === 'new'
    ? `test_${Date.now()}@example.com`
    : process.argv[3] || 'admin@example.com';

runOnce(email).then(result => {
  if (!result.ok) {
    console.log('\nRESULT: FAIL at', result.stage);
    console.log('If failing at login-with-code with “Database error creating new user”, apply supabase migration 37_fix_auth_user_trigger.sql (or 38_fix_auth_user_trigger_v2.sql).');
    process.exit(2);
  }
  console.log('\nRESULT: PASS');
});

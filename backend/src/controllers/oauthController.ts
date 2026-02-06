import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

// Store codes in memory for simplicity (In production, use Redis or DB)
const authCodes = new Map<string, { userId: string, clientId: string, expiresAt: number }>();

export const authorize = async (req: Request, res: Response) => {
  const { response_type,client_id, redirect_uri, state } = req.query;
  const user = (req as any).user; // From middleware

  if (!user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (response_type !== 'code') {
    return res.status(400).json({ error: 'Unsupported response_type' });
  }

  // Verify client
  const { data: app } = await supabase
    .from('saas_apps')
    .select('*')
    .eq('client_id', client_id)
    .single();

  if (!app) {
    return res.status(400).json({ error: 'Invalid client_id' });
  }

  // TODO: Verify redirect_uri against allowed list in app.redirect_uris

  // Generate code
  const code = Math.random().toString(36).substring(2, 15);
  authCodes.set(code, {
    userId: user.id,
    clientId: String(client_id),
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 mins
  });

  // Redirect back
  const redirectUrl = new URL(String(redirect_uri));
  redirectUrl.searchParams.append('code', code);
  if (state) redirectUrl.searchParams.append('state', String(state));

  res.redirect(redirectUrl.toString());
};

export const token = async (req: Request, res: Response) => {
  const { grant_type, code, client_id, client_secret } = req.body;

  if (grant_type === 'authorization_code') {
    const authCode = authCodes.get(code);
    
    if (!authCode || authCode.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    if (authCode.clientId !== client_id) {
      return res.status(400).json({ error: 'Client mismatch' });
    }

    // Verify client secret
    const { data: app } = await supabase
      .from('saas_apps')
      .select('api_secret') // Assuming api_secret is client_secret for now
      .eq('client_id', client_id)
      .single();

    if (!app || app.api_secret !== client_secret) { // In prod, compare hashes
      return res.status(401).json({ error: 'Invalid client_secret' });
    }

    // Generate Token
    const accessToken = jwt.sign(
      { sub: authCode.userId, aud: client_id, iss: 'AdminSys' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const idToken = jwt.sign(
      { sub: authCode.userId, aud: client_id, iss: 'AdminSys', name: 'User' }, // Add more profile info
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    authCodes.delete(code); // Consume code

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      id_token: idToken
    });
  }

  res.status(400).json({ error: 'Unsupported grant_type' });
};

export const userinfo = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send();

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.sub)
      .single();

    if (!user) return res.status(404).send();

    res.json({
      sub: user.id,
      name: user.full_name,
      email: user.email,
      picture: user.avatar_url,
      // Add RBAC roles/permissions here if needed
    });
  } catch (err) {
    res.status(401).send();
  }
};

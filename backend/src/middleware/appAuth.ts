
import express from 'express';
import jwt from 'jsonwebtoken';
import { SystemLogger } from '../lib/logger.ts';

// Use a distinct secret for App User Tokens to separate from Admin Tokens
// In production, this should be in .env
const APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'default-insecure-app-jwt-secret-CHANGE-ME';

export interface AppUserPayload {
  sub: string;      // user_id
  app_id: string;   // scoped app_id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      appUser?: AppUserPayload;
    }
  }
}

/**
 * Middleware to validate Scoped App User Token
 * Requires openApiGuard to be run first to populate req.currentApp
 */
export const requireAppUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) {
    res.status(401).json({ error: 'Invalid Token Format' });
    return;
  }

  try {
    const decoded = jwt.verify(token, APP_JWT_SECRET) as AppUserPayload;

    // 1. Verify Scope: Token's app_id must match the Request's Context App
    if (req.currentApp && decoded.app_id !== req.currentApp.id) {
      res.status(403).json({ error: 'Token is not valid for this App Context' });
      return;
    }

    // 2. Attach User to Request
    req.appUser = decoded;
    next();
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('App Token Verification Failed:', err);

    // Log to System Error Logs
    SystemLogger.logError({
      level: 'WARN',
      message: `App Token Verification Failed: ${errorMsg}`,
      stack_trace: err instanceof Error ? err.stack : undefined,
      path: req.originalUrl,
      method: req.method,
      ip_address: req.ip,
      context: { headers: req.headers }
    }).catch(e => console.error('Failed to log auth error', e));

    res.status(401).json({ error: 'Invalid or Expired Token' });
  }
};

/**
 * Helper to sign a Scoped Token
 */
export const signAppUserToken = (user: { id: string; email: string }, appId: string) => {
  const payload: AppUserPayload = {
    sub: user.id,
    app_id: appId,
    email: user.email,
    role: 'customer'
  };

  // Expires in 7 days
  return jwt.sign(payload, APP_JWT_SECRET, { expiresIn: '7d' });
};

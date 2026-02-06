import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { AuditLogService } from '../services/auditService.ts';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

/**
 * Middleware to extract user from Supabase JWT
 * Does not block the request if token is missing/invalid, just sets req.user to undefined.
 */
export const extractUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
        // Use getUser to verify the token
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
            req.user = {
            id: user.id,
            email: user.email
            };
        } else if (error) {
            console.error('extractUser: invalid/expired token', { message: error.message, status: (error as any).status });
        }
        }
    }
  } catch (err) {
      console.error('Error in extractUser:', err);
  }
  next();
};

/**
 * Middleware to automatically log write operations (POST, PUT, DELETE, PATCH)
 */
export const autoAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  // Only log mutating methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // List of paths to ignore to reduce noise and storage costs
    // 1. /api/audit-logs: prevent recursion
    // 2. /api/auth: handled by auth controller with specific events (LOGIN, LOGOUT) or high volume refresh tokens
    // 3. /api/ai/chat: high volume, content stored in dedicated ai_chat_messages table
    const IGNORED_PREFIXES = [
        '/api/audit-logs', 
        '/api/auth', 
        '/api/ai/chat'
    ];

    if (IGNORED_PREFIXES.some(prefix => req.originalUrl.startsWith(prefix))) {
      return next();
    }

    const originalSend = res.send;
    let responseBody: any;

    // Intercept response to check success/failure
    res.send = function (body) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    res.on('finish', () => {
      // Determine status
      const status = (res.statusCode >= 200 && res.statusCode < 400) ? 'SUCCESS' : 'FAILURE';
      
      // Determine resource from URL
      // e.g., /api/database/tables -> database
      const parts = req.originalUrl.split('/');
      const resource = parts.length > 2 ? parts[2] : 'unknown';

      const sanitize = (body: any) => {
        if (!body || typeof body !== 'object') return body;
        const cloned: any = Array.isArray(body) ? [...body] : { ...body };
        const keysToRedact = [
          'password',
          'api_secret',
          'apiSecret',
          'access_token',
          'refresh_token',
          'token',
          'code'
        ];
        for (const key of keysToRedact) {
          if (key in cloned) cloned[key] = '[REDACTED]';
        }
        return cloned;
      };

      void AuditLogService.log({
        user_id: req.user?.id,
        app_id: req.currentApp?.id,
        action: req.method,
        resource: resource,
        details: {
          url: req.originalUrl,
          body: sanitize(req.body)
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        status: status
      });
    });
  }
  next();
};

import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Extend Request to include currentApp
declare global {
  namespace Express {
    interface Request {
      currentApp?: {
        id: string;
        name: string;
        role: 'app';
      };
    }
  }
}

import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { RedisService } from '../../services/RedisService.ts';

// ... (existing imports)

/**
 * Open API Rate Limiter
 * - Uses Redis if available, otherwise Memory
 * - Dynamic limits based on App Plan
 */
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: async (req: Request, res: Response) => {
        // Default limit
        let limit = 60; // 60 req/min for Free/Dev
        
        if (req.currentApp) {
            // Fetch Plan from App (Cached in Request or Redis ideally)
            // For MVP, we assume a `plan` field on currentApp or fetch from DB
            // Here we can optimize by caching plan in Redis
            // const plan = req.currentApp.plan || 'free';
            // if (plan === 'pro') limit = 1000;
            // if (plan === 'enterprise') limit = 10000;
            
            // For now, hardcode a logic:
            limit = 100; // Base limit for authenticated apps
        }
        return limit;
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => (req.headers['x-app-key'] as string) || req.ip || 'unknown',
    store: (() => {
        const client = RedisService.getClientOptional();
        if (client) {
            return new RedisStore({
                // @ts-ignore - ioredis types mismatch with rate-limit-redis sometimes
                sendCommand: (...args: string[]) => client.call(...args),
            });
        }
        return undefined; // MemoryStore
    })(),
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Upgrade your plan for higher limits.'
        });
    }
});

/**
 * Open API Guard
 * Validates x-app-key and signature
 */
export const openApiGuard = async (req: Request, res: Response, next: NextFunction) => {
    // 1. First run the auth logic (Authentication)
    await runAuthCheck(req, res, async (err?: any) => {
        if (err) return next(err);
        
        // 2. Then run Rate Limiter (Authorization/Quota)
        // Only rate limit valid requests to prevent DOS on Redis via invalid keys?
        // Actually better to rate limit IP for invalid keys, and AppKey for valid ones.
        // For simplicity, we run limiter AFTER auth injection so we have currentApp context.
        limiter(req, res, next);
    });
};

const runAuthCheck = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-app-key'] as string;
  const apiSecret = req.headers['x-app-secret'] as string;
  
  const timestamp = req.headers['x-timestamp'] as string;
  const nonce = req.headers['x-nonce'] as string;
  const signature = req.headers['x-signature'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API Key (x-app-key)' });
  }

  const startTime = Date.now();

  try {
    // 1. Verify App
    const { data: app, error } = await supabase
      .from('saas_apps')
      .select('id, name, status, api_secret, allowed_ips')
      .eq('api_key', apiKey)
      .single();

    if (error || !app) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    if (app.status !== 'Active' && app.status !== 'Development') {
        return res.status(403).json({ error: 'App is suspended or inactive' });
    }

    // 2. IP Whitelist Check
    if (app.allowed_ips) {
        const clientIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
        const allowedList = app.allowed_ips.split(',').map((ip: string) => ip.trim());
        
        // Simple exact match or CIDR (basic implementation)
        // For MVP, we do exact match or allow *
        const isAllowed = allowedList.includes('*') || allowedList.includes(clientIp);
        
        if (!isAllowed) {
            // Log rejection
            logApiCall(app.id, req, 403, Date.now() - startTime, 'IP Not Allowed');
            return res.status(403).json({ error: 'IP Address not allowed', ip: clientIp });
        }
    }

    // 3. Verify Authentication (Signature or Secret)
    let isAuthenticated = false;

    // Mode A: Signature (Recommended)
    if (signature && timestamp && nonce) {
        // Prevent Replay (Time window: 5 mins)
        const now = Math.floor(Date.now() / 1000);
        const reqTime = parseInt(timestamp);
        if (Math.abs(now - reqTime) > 300) {
             return res.status(401).json({ error: 'Timestamp expired' });
        }

        // Calculate Signature
        // Sign: Method + Path + Timestamp + Nonce + BodyString
        // Note: req.body might need to be canonicalized. For now, we assume simple JSON string.
        const bodyStr = Object.keys(req.body).length ? JSON.stringify(req.body) : '';
        const rawString = `${req.method.toUpperCase()}${req.originalUrl}${timestamp}${nonce}${bodyStr}`;
        
        const expectedSignature = crypto
            .createHmac('sha256', app.api_secret)
            .update(rawString)
            .digest('hex');

        if (signature === expectedSignature) {
            isAuthenticated = true;
        } else {
             logApiCall(app.id, req, 401, Date.now() - startTime, 'Invalid Signature');
             return res.status(401).json({ error: 'Invalid Signature' });
        }
    } 
    // Mode B: Simple Secret (Legacy/Dev)
    else if (apiSecret) {
        if (app.api_secret === apiSecret) {
            isAuthenticated = true;
        } else {
             logApiCall(app.id, req, 401, Date.now() - startTime, 'Invalid API Secret');
             return res.status(401).json({ error: 'Invalid API Secret' });
        }
    } else {
        return res.status(401).json({ error: 'Missing Authentication (Signature or Secret)' });
    }

    if (!isAuthenticated) return; // Should not reach here

    // 4. Inject Context
    req.currentApp = {
      id: app.id,
      name: app.name,
      role: 'app'
    };

    // 5. Async Logging (Response Finish)
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logApiCall(app.id, req, res.statusCode, duration);
    });

    next();
  } catch (err) {
    console.error('OpenAPI Auth Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

import { MeteringService } from '../../services/MeteringService.ts';

// Helper: Async Logger
const logApiCall = async (appId: string, req: Request, status: number, latency: number, errorMsg?: string) => {
    try {
        const clientIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
        
        await supabase.from('api_logs').insert({
            app_id: appId,
            method: req.method,
            path: req.originalUrl,
            status_code: status,
            latency_ms: latency,
            client_ip: clientIp,
            user_agent: req.headers['user-agent'],
            error_message: errorMsg
        });

        // Billing: Record API Call (Success only usually, or all depending on strategy)
        // Here we record all attempts that passed authentication
        if (status < 500) { // Don't bill for internal errors, but bill for user errors?
             // Let's bill for any authenticated request
             MeteringService.recordUsage(appId, 'api_call', 1, {
                 method: req.method,
                 path: req.originalUrl,
                 status_code: status
             });
        }

    } catch (e) {
        console.error('Failed to log API call:', e);
    }
};


import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { RedisService } from '../services/RedisService.ts';
import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Dynamic Rate Limiter
 * Limits requests based on App Tier (Free/Pro)
 */
export const apiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: async (req: Request, res: Response) => {
        // Default limit for unauthenticated IPs
        if (!req.headers['x-app-id']) {
            return 20; // 20 req/min for anonymous
        }
        
        // If authenticated (App ID present)
        // We can fetch limit from Redis cache or DB
        const appId = req.headers['x-app-id'] as string;
        
        // Optimization: Cache tier in Redis?
        // For now, we query DB or assume a standard limit based on plan.
        // Let's assume we fetch `config` from `saas_apps` which has `rate_limit`
        
        try {
            // Check if we have cached config in Redis
            const redis = RedisService.getClient();
            const cachedLimit = await redis.get(`app:${appId}:limit`);
            if (cachedLimit) return parseInt(cachedLimit);

            // Fetch from DB
            const { data, error } = await supabase
                .from('saas_apps')
                .select('config')
                .eq('id', appId) // Assuming appId is the ID. If it's ClientID, we need to lookup.
                // Note: Frontend sends 'x-app-id' which is usually the UUID.
                .single();
            
            let limit = 60; // Default 60 req/min
            
            if (data && data.config && data.config.rate_limit) {
                limit = parseInt(data.config.rate_limit);
            }
            
            // Cache for 10 mins
            await redis.setex(`app:${appId}:limit`, 600, limit);
            
            return limit;
        } catch (err) {
            console.error('RateLimit Lookup Error:', err);
            return 60; // Fallback
        }
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: (() => {
        const client = RedisService.getClientOptional();
        if (!client) return undefined;
        return new RedisStore({
            sendCommand: (...args: string[]) => (client as any).call(...args),
        });
    })(),
    keyGenerator: (req: Request) => {
        return (req.headers['x-app-id'] as string) || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            error: 'Too many requests, please try again later.',
            retryAfter: res.getHeader('Retry-After')
        });
    }
});

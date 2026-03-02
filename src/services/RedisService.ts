
import { Redis as IORedis } from 'ioredis';
import type { Redis as RedisClient } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

// We use a singleton pattern for Redis client
let redisClient: RedisClient | null = null;

export const RedisService = {
    getClientOptional: (): RedisClient | null => {
        if (!redisUrl || redisUrl === 'undefined' || redisUrl === '') return null;
        if (redisClient) return redisClient;
        try {
            const client = new IORedis(redisUrl, {
                maxRetriesPerRequest: 1,
                enableOfflineQueue: false,
                lazyConnect: true // Important: Don't connect on instantiation, wait for first command
            });
            
            // We need to manually connect if not using lazyConnect, but with lazyConnect=true
            // it will connect on first command. However, rate-limit-redis might expect a connected client
            // or handles connection itself. 
            // Actually, let's just use lazyConnect=true to prevent startup crash if URL is bad.
            
            client.on('error', (err: any) => {
                // Suppress unhandled error crashes
                console.warn('[Redis] Connection Error (Non-fatal):', err.message);
            });
            client.on('connect', () => {
                console.log('[Redis] Connected');
            });
            redisClient = client as unknown as RedisClient;
            return redisClient;
        } catch (err) {
            console.error('[Redis] Init Error:', err);
            return null;
        }
    },

    getClient: (): RedisClient => {
        const client = RedisService.getClientOptional();
        if (!client) {
            throw new Error('REDIS_URL not configured');
        }
        return client;
    },

    /**
     * Check if Redis is healthy
     */
    healthCheck: async (): Promise<boolean> => {
        try {
            const client = RedisService.getClientOptional();
            if (!client) return false;
            await client.ping();
            return true;
        } catch (e) {
            return false;
        }
    }
};

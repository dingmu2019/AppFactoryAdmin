
import { Redis as IORedis } from 'ioredis';
import type { Redis as RedisClient } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

// We use a singleton pattern for Redis client
let redisClient: RedisClient | null = null;

export const RedisService = {
    getClientOptional: (): RedisClient | null => {
        if (!redisUrl) return null;
        if (redisClient) return redisClient;
        const client = new IORedis(redisUrl, {
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false
        });
        client.on('error', (err: any) => {
            console.error('[Redis] Error:', err);
        });
        client.on('connect', () => {
            console.log('[Redis] Connected');
        });
        redisClient = client as unknown as RedisClient;
        return redisClient;
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

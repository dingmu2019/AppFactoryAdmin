import { getDatabaseDumpConfig } from '@/lib/db';

// Initialize PgBoss
// Note: We need a direct connection string to the DB, not HTTP API URL.
// Since we are running in backend with potential access to connection string.
// If DATABASE_URL is not set, we might need to rely on other env vars or Supabase connection pooling.
// For now, we assume DATABASE_URL is available or we construct it.

let boss: any = null;

export const JobQueue = {
    async init(): Promise<boolean> {
        if (boss) return true;
        // pg-boss might be too heavy for serverless, but we can try if needed.
        // Usually job queues run on long-running servers.
        if (process.env.VERCEL) return false;

        let connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
             try {
                // Reuse the robust config resolution from db.ts
                const config = await getDatabaseDumpConfig();
                // Construct connection string from config
                // pg-boss expects a connection string or config object. 
                // We'll build a string for simplicity as per existing pattern.
                const user = encodeURIComponent(config.user);
                const password = encodeURIComponent(config.password || '');
                const host = config.host;
                const port = config.port;
                const dbName = config.database;
                const sslMode = config.ssl ? '?sslmode=require' : '';
                
                connectionString = `postgres://${user}:${password}@${host}:${port}/${dbName}${sslMode}`;
             } catch (e) {
                // If unified config fails, we might fall back to the old hardcoded way below, 
                // or just log warning.
                console.warn('JobQueue: Failed to resolve database config via unified logic:', e);
             }
        }
        
        // Fallback for dev environment if getDatabaseDumpConfig failed or returned nothing useful
        if (!connectionString) {
             connectionString = `postgres://postgres.kkezqharxaqeqzumuehr:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
        }

        if (!connectionString || /YOUR_DB_PASSWORD/i.test(connectionString) || /undefined/i.test(connectionString)) {
            console.warn('DATABASE_URL not configured correctly. JobQueue (pg-boss) disabled.');
            return false;
        }

        try {
            const PgBossPkg: any = await import('pg-boss');
            const PgBoss = PgBossPkg.default || PgBossPkg.PgBoss || PgBossPkg;
            boss = new PgBoss(connectionString);
            boss.on('error', (error: any) => console.error('JobQueue Error:', error));
            await boss.start();
            console.log('JobQueue (pg-boss) started');
            return true;
        } catch (error: any) {
            console.warn('JobQueue init failed. Disabled.', error?.message || error);
            boss = null;
            return false;
        }
    },

    async schedule(name: string, data: any, options?: any) {
        if (!boss) {
             console.warn('JobQueue not initialized. Task skipped:', name);
             return null;
        }
        return boss.send(name, data, options);
    },

    async work(name: string, handler: (job: any) => Promise<void>) {
        if (!boss) return;
        await boss.work(name, handler);
    },

    get instance() {
        return boss;
    }
};

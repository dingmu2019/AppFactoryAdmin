import dotenv from 'dotenv';

dotenv.config();

// Initialize PgBoss
// Note: We need a direct connection string to the DB, not HTTP API URL.
// Since we are running in backend with potential access to connection string.
// If DATABASE_URL is not set, we might need to rely on other env vars or Supabase connection pooling.
// For now, we assume DATABASE_URL is available or we construct it.

let boss: any = null;

export const JobQueue = {
    async init(): Promise<boolean> {
        if (boss) return true;
        if (process.env.VERCEL) return false;

        const connectionString =
            process.env.DATABASE_URL ||
            `postgres://postgres.kkezqharxaqeqzumuehr:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

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

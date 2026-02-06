
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { JobQueue } from './jobQueue.ts';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface AlertOptions {
    level: 'info' | 'warn' | 'error' | 'critical';
    category: string;
    message: string;
    error?: Error | any;
    appId?: string;
    metadata?: Record<string, any>;
}

export class AlertService {

    /**
     * Log an alert to DB and optionally notify admins via JobQueue
     */
    static async alert(options: AlertOptions) {
        const { level, category, message, error, appId, metadata } = options;

        // 1. Prepare Data
        const stackTrace = error?.stack || null;
        const safeMetadata = metadata || {};
        if (error && error.message) {
             safeMetadata.errorMessage = error.message;
        }

        // 2. Insert into DB
        const { data: log, error: dbError } = await supabase
            .from('system_error_logs')
            .insert({
                level,
                category,
                message,
                app_id: appId,
                stack_trace: stackTrace,
                metadata: safeMetadata
            })
            .select()
            .single();

        if (dbError) {
            console.error('[AlertService] Failed to write log:', dbError);
            // Fallback to console
            console.error(JSON.stringify(options));
            return;
        }

        // 3. Trigger Notification for Critical/Error levels
        // We use JobQueue to avoid blocking the main thread with external API calls (e.g. Email/Slack)
        if (level === 'critical' || level === 'error') {
            await JobQueue.schedule('system-alert-notify', {
                logId: log.id,
                level,
                category,
                message,
                timestamp: new Date().toISOString()
            }, {
                retryLimit: 3
            });
        }
    }
}

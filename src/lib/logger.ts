import { getSupabaseAdmin } from './supabase';

export interface LogEntry {
  level: 'ERROR' | 'WARN' | 'FATAL' | 'INFO';
  message: string;
  stack_trace?: string;
  context?: any;
  app_id?: string;
  user_id?: string;
  ip_address?: string;
  path?: string;
  method?: string;
}

/**
 * Simplified Logger to avoid dependencies like 'pino' which might cause issues in Serverless/Edge environments.
 */
export const logger = {
  info: (msg: any, ...args: any[]) => console.log(`[INFO]`, msg, ...args),
  warn: (msg: any, ...args: any[]) => console.warn(`[WARN]`, msg, ...args),
  error: (msg: any, ...args: any[]) => console.error(`[ERROR]`, msg, ...args),
  fatal: (msg: any, ...args: any[]) => console.error(`[FATAL]`, msg, ...args),
};

export const SystemLogger = {
  async logError(entry: LogEntry) {
    // 1. Log to Console (Stdout)
    const logFn = entry.level === 'ERROR' ? console.error :
                  entry.level === 'WARN' ? console.warn :
                  entry.level === 'FATAL' ? console.error :
                  console.log;
    
    logFn(`[SystemLogger] ${entry.level}: ${entry.message}`, {
      path: entry.path,
      method: entry.method,
      stack: entry.stack_trace,
      context: entry.context
    });

    // 2. Persist to DB (Asynchronously)
    try {
      const supabase = getSupabaseAdmin();
      
      // We don't await here to avoid blocking the main request
      supabase.from('system_error_logs').insert([{
        level: entry.level,
        message: entry.message.substring(0, 1000),
        stack_trace: entry.stack_trace,
        context: entry.context || {},
        app_id: entry.app_id || 'AdminSys',
        user_id: entry.user_id,
        ip_address: entry.ip_address,
        path: entry.path,
        method: entry.method,
        resolved: false
      }]).then(({ error }) => {
        if (error) console.error('[SystemLogger] Failed to write to DB:', error);
      }).catch(err => console.error('[SystemLogger] Uncaught DB error:', err));
      
    } catch (err) {
      console.error('[SystemLogger] Unexpected error:', err);
    }
  }
};
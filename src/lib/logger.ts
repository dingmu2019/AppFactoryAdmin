import pino from 'pino';
import { supabaseAdmin as supabase } from './supabase';

// Create Pino Logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    env: process.env.NODE_ENV,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  },
});

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

export const SystemLogger = {
  async logError(entry: LogEntry) {
    // 1. Structured Log to Stdout
    const logFn = entry.level === 'ERROR' ? logger.error.bind(logger) :
                  entry.level === 'WARN' ? logger.warn.bind(logger) :
                  entry.level === 'FATAL' ? logger.fatal.bind(logger) :
                  logger.info.bind(logger);
    
    logFn({ 
      ...entry,
      err: entry.stack_trace ? { stack: entry.stack_trace } : undefined
    }, entry.message);

    // 2. Persist to DB (Keep existing logic)
    try {
      // Check if supabase is initialized correctly (URL/Key check happens in supabase.ts)
      const { error } = await supabase.from('system_error_logs').insert([{
        level: entry.level,
        message: entry.message.substring(0, 1000),
        stack_trace: entry.stack_trace,
        context: entry.context || {},
        app_id: entry.app_id,
        user_id: entry.user_id,
        ip_address: entry.ip_address,
        path: entry.path,
        method: entry.method,
        resolved: false
      }]);

      if (error) {
        logger.error({ err: error }, 'SystemLogger: Failed to insert log to DB');
      }
    } catch (err) {
      logger.error({ err }, 'SystemLogger: Unexpected error writing to DB');
    }
  }
};
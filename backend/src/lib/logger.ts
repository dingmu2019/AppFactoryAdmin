import pino from 'pino';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Create Pino Logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  } : undefined,
  base: {
    env: process.env.NODE_ENV,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  },
});

// Legacy SystemLogger for compatibility & DB Audit
// We can gradually migrate away from this or keep it for specific DB logging
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Create a dedicated client for logging to avoid circular dependencies
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
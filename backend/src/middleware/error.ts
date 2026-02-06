import type { Request, Response, NextFunction } from 'express';
import { SystemLogger } from '../lib/logger.ts';
import { AlertService } from '../services/AlertService.ts';

/**
 * Global Error Handling Middleware
 * Captures all unhandled exceptions and logs them to system_error_logs table
 */
export const globalErrorHandler = async (err: any, req: Request, res: Response, next: NextFunction) => {
  // 1. Determine Error Context
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const stack = err.stack || '';

  // 2. Log to Database via SystemLogger
  await SystemLogger.logError({
    level: 'ERROR',
    message: message,
    stack_trace: stack,
    context: {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: {
          ...req.headers,
          authorization: 'REDACTED'
      }
    },
    app_id: req.currentApp?.id,
    user_id: req.user?.id,
    ip_address: req.ip,
    path: req.originalUrl,
    method: req.method
  });

  // Log 500 errors to AlertService
  if (status >= 500) {
    AlertService.alert({
      level: 'error',
      category: 'api',
      message: `API Error: ${message}`,
      error: err,
      appId: req.currentApp?.id,
      metadata: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
      }
    }).catch(e => console.error('Failed to alert:', e));
  }

  // 3. Send Response to Client
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Standardize error response to match existing ad-hoc pattern: { error: "message" }
  // instead of { error: { message: "...", status: ... } }
  // This ensures backward compatibility with frontend while enabling global error handling.
  res.status(status).json({
    error: message,
    ...(isProduction ? {} : { stack, details: err.details || err.context })
  });
};

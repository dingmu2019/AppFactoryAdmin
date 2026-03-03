
import { NextRequest, NextResponse } from 'next/server';
import { SystemLogger } from './logger';
import { safeAfter } from './supabase';

export type ApiHandler = (
  req: NextRequest,
  params?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function to wrap API handlers with error logging.
 * Uses 'after()' via safeAfter to ensure logging completes without blocking the response.
 */
export function withApiErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error: any) {
      const method = req.method;
      const url = req.nextUrl.pathname;
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';
      const appId = req.headers.get('x-app-id') || undefined;
      const userId = req.headers.get('x-user-id') || undefined;

      // 使用 after() 确保在响应发送后安全记录日志，不阻塞用户且防止环境冻结
      safeAfter(() => {
        SystemLogger.logError({
          level: 'ERROR',
          message: error.message || 'Internal Server Error',
          stack_trace: error.stack,
          path: url,
          method: method,
          ip_address: ip,
          app_id: appId,
          user_id: userId,
          context: {
            userAgent,
            query: Object.fromEntries(req.nextUrl.searchParams),
          }
        }).catch(err => console.error('[API Wrapper] Background logging failed:', err));
      });

      console.error(`[API Error] ${method} ${url}:`, error);

      return NextResponse.json(
        { 
          error: 'Internal Server Error', 
          message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred' 
        },
        { status: 500 }
      );
    }
  };
}

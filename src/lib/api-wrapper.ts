
import { NextRequest, NextResponse } from 'next/server';
import { SystemLogger } from './logger';

export type ApiHandler = (
  req: NextRequest,
  params?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function to wrap API handlers with error logging.
 * Captures any unhandled exceptions, logs them to SystemLogger, and returns a standard 500 error response.
 */
export function withApiErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error: any) {
      // Extract request details
      const method = req.method;
      const url = req.nextUrl.pathname;
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';
      
      // Try to get user/app context from headers if available (set by middleware or previous logic)
      const appId = req.headers.get('x-app-id') || undefined;
      const userId = req.headers.get('x-user-id') || undefined;

      // Log the error
      await SystemLogger.logError({
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
      });

      console.error(`[API Error] ${method} ${url}:`, error);

      // Return standardized error response
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

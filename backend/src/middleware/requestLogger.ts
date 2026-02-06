import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger.ts';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // 1. Generate Request ID
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  // 2. Log Request
  // We log the incoming request immediately
  logger.info({
    req: {
      method: req.method,
      url: req.url,
      id: requestId,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-app-key': req.headers['x-app-key']
      },
      remoteAddress: req.ip
    }
  }, 'Incoming Request');

  // 3. Log Response (on finish)
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel]({
      res, // Pass actual response object for standard serializer
      requestId,
      duration
    }, 'Request Completed');
  });

  next();
};
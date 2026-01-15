import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CorrelationService } from '../services/correlation.service';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  constructor(private correlationService: CorrelationService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Extract correlation ID from header or generate new
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      this.correlationService.generateCorrelationId();

    // Extract session ID
    const sessionId = this.correlationService.extractSessionId({
      headers: req.headers,
      cookies: req.cookies as Record<string, string>,
      user: (req as any).user,
    });

    // Extract request ID
    const requestId = (req.headers['x-request-id'] as string) || undefined;

    // Start correlation context
    this.correlationService.startContext({
      correlationId,
      sessionId: sessionId || undefined,
      requestId,
    });

    // Attach to request
    (req as any).correlationId = correlationId;
    (req as any).sessionId = sessionId || undefined;
    (req as any).requestId = requestId;

    // Set response headers
    res.setHeader('X-Correlation-ID', correlationId);
    if (requestId) {
      res.setHeader('X-Request-ID', requestId);
    }

    // Clear context when request completes
    res.on('finish', () => {
      this.correlationService.clearContext();
    });

    next();
  }
}


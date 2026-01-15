import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface CorrelationContext {
  correlationId: string | null;
  causationId: string | null;
  sessionId: string | null;
  requestId: string | null;
}

@Injectable()
export class CorrelationService {
  private context: CorrelationContext = {
    correlationId: null,
    causationId: null,
    sessionId: null,
    requestId: null,
  };

  /**
   * Generate new correlation ID for workflow
   */
  generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Start new correlation context (call at request start)
   */
  startContext(params: {
    sessionId?: string | null;
    requestId?: string | null;
    correlationId?: string | null;
  }): void {
    this.context = {
      correlationId: params.correlationId || this.generateCorrelationId(),
      causationId: null, // Reset for new workflow
      sessionId: params.sessionId || null,
      requestId: params.requestId || null,
    };
  }

  /**
   * Get current correlation context
   */
  getContext(): CorrelationContext {
    return { ...this.context };
  }

  /**
   * Set causation ID for next event in chain
   */
  setCausation(eventId: string): void {
    this.context.causationId = eventId;
  }

  /**
   * Clear causation (for direct user actions)
   */
  clearCausation(): void {
    this.context.causationId = null;
  }

  /**
   * Get or create correlation ID from request context
   */
  getOrCreateCorrelationId(context: {
    headers?: Record<string, string | string[] | undefined>;
    correlationId?: string;
  }): string {
    // 1. Check existing context
    if (this.context.correlationId) {
      return this.context.correlationId;
    }

    // 2. Check request context
    if (context.correlationId) {
      this.context.correlationId = context.correlationId;
      return context.correlationId;
    }

    // 3. Check HTTP header
    const headerId = context.headers?.['x-correlation-id'];
    if (headerId) {
      const id = Array.isArray(headerId) ? headerId[0] : headerId;
      this.context.correlationId = id;
      return id;
    }

    // 4. Generate new
    const newId = this.generateCorrelationId();
    this.context.correlationId = newId;
    return newId;
  }

  /**
   * Clear context (call at request end)
   */
  clearContext(): void {
    this.context = {
      correlationId: null,
      causationId: null,
      sessionId: null,
      requestId: null,
    };
  }

  /**
   * Extract session ID from request
   */
  extractSessionId(context: {
    headers?: Record<string, string | string[] | undefined>;
    cookies?: Record<string, string>;
    user?: { sessionId?: string };
  }): string | null {
    // 1. From user object
    if (context.user?.sessionId) {
      return context.user.sessionId;
    }

    // 2. From cookie
    if (context.cookies?.sessionId) {
      return context.cookies.sessionId;
    }

    // 3. From header
    const headerSession = context.headers?.['x-session-id'];
    if (headerSession) {
      return Array.isArray(headerSession) ? headerSession[0] : headerSession;
    }

    return null;
  }
}













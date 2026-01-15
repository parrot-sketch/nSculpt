import {
  ExceptionFilter,
  Catch,
  HttpException,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CorrelationService } from '../../services/correlation.service';

/**
 * Enhanced global filter for standard HttpExceptions.
 * Captures request context and correlation ID for traceability.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly correlationService: CorrelationService) { }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const context = this.correlationService.getContext();

    const responseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      correlationId: context.correlationId,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message,
      error:
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).error
          : exception.name,
    };

    // Log warns for 4xx and errors for 5xx (though HttpException is usually 4xx)
    const logMethod = status >= 500 ? 'error' : 'warn';
    this.logger[logMethod](
      `${request.method} ${request.url} [${status}]: ${responseBody.message}`,
      logMethod === 'error' ? exception.stack : undefined,
      {
        correlationId: context.correlationId,
        sessionId: context.sessionId,
      }
    );

    response.status(status).json(responseBody);
  }
}













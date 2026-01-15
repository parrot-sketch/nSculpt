import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';
import { CorrelationService } from '../../services/correlation.service';

/**
 * Global filter for all unhandled exceptions (Internal Server Errors)
 * Ensures that even crashes are caught and returned as structured JSON
 * without leaking sensitive stack traces in production.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly correlationService: CorrelationService,
    ) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        // In certain corner cases, the httpAdapterHost might not be available yet
        const { httpAdapter } = this.httpAdapterHost;

        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        const context = this.correlationService.getContext();

        const message = exception instanceof Error ? exception.message : 'An unexpected error occurred';
        const stack = exception instanceof Error ? exception.stack : undefined;

        // Log the error with full context
        this.logger.error(
            `Unhandled Exception: ${message}`,
            stack,
            {
                path: request.url,
                method: request.method,
                correlationId: context.correlationId,
                sessionId: context.sessionId,
            }
        );

        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(ctx.getRequest()),
            method: request.method,
            correlationId: context.correlationId,
            message: 'Internal server error', // Generic message for security
            error: 'Internal Server Error',
        };

        // Include detailed message only in development for easier debugging
        if (process.env.NODE_ENV !== 'production') {
            (responseBody as any).developerMessage = message;
        }

        httpAdapter.reply(response, responseBody, httpStatus);
    }
}

import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { CorrelationService } from '../../services/correlation.service';

/**
 * specialized filter for PrismaClientKnownRequestError
 * Maps database errors (unique constraints, not found, etc.) to meaningful HTTP codes.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
    private readonly logger = new Logger(PrismaClientExceptionFilter.name);

    constructor(private readonly correlationService: CorrelationService) {
        super();
    }

    catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const context = this.correlationService.getContext();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Database error occurred';
        let errorType = 'Internal Server Error';

        // Map Prisma Error Codes to HTTP Statuses
        // Reference: https://www.prisma.io/docs/reference/api-reference/error-reference#prismaclientknownrequesterror
        switch (exception.code) {
            case 'P2000': // The provided value for the column is too long
                status = HttpStatus.BAD_REQUEST;
                message = 'The provided data is too long for one of the fields.';
                errorType = 'Bad Request';
                break;
            case 'P2002': // Unique constraint failed
                status = HttpStatus.CONFLICT;
                const target = (exception.meta?.target as string[]) || ['unknown field'];
                message = `A record with this ${target.join(', ')} already exists.`;
                errorType = 'Conflict';
                break;
            case 'P2025': // An operation failed because it depends on one or more records that were not found
                status = HttpStatus.NOT_FOUND;
                message = (exception.meta?.cause as string) || 'The requested record was not found.';
                errorType = 'Not Found';
                break;
            case 'P2003': // Foreign key constraint failed
                status = HttpStatus.BAD_REQUEST;
                message = 'The operation failed because of a related record constraint.';
                errorType = 'Bad Request';
                break;
            default:
                // Keep internal server error for others but log the code
                this.logger.warn(`Unmapped Prisma error: ${exception.code}`);
                break;
        }

        this.logger.error(
            `Prisma Error [${exception.code}]: ${message}`,
            exception.stack,
            {
                path: request.url,
                correlationId: context.correlationId,
                metadata: exception.meta,
            }
        );

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            correlationId: context.correlationId,
            message,
            error: errorType,
            errorCode: exception.code,
        });
    }
}

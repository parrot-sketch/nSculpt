import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { DataAccessLogService } from '../../modules/audit/services/dataAccessLog.service';

/**
 * Data Access Log Interceptor
 * 
 * Logs all PHI access for HIPAA compliance
 * Should be applied to all endpoints that access medical records
 */
@Injectable()
export class DataAccessLogInterceptor implements NestInterceptor {
  constructor(
    @Inject(forwardRef(() => DataAccessLogService))
    private readonly dataAccessLogService: DataAccessLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user = request.user;

    // Extract resource information from request
    const resourceType = this.extractResourceType(request);
    const resourceId = this.extractResourceId(request);
    const action = this.extractAction(request.method);

    // Determine if PHI is being accessed
    const accessedPHI = this.isPHIAccess(resourceType, action);

    return next.handle().pipe(
      tap({
        next: async () => {
          if (user?.id && resourceId) {
            try {
              await this.dataAccessLogService.log({
                userId: user.id,
                resourceType,
                resourceId,
                action,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
                sessionId: (request as any).sessionId,
                accessedPHI,
                success: true,
              });
            } catch (error) {
              // Log error but don't fail the request
              console.error('Failed to log data access:', error);
            }
          }
        },
        error: async (error) => {
          if (user?.id && resourceId) {
            try {
              await this.dataAccessLogService.log({
                userId: user.id,
                resourceType,
                resourceId,
                action,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
                sessionId: (request as any).sessionId,
                accessedPHI,
                success: false,
                errorMessage: error.message,
              });
            } catch (logError) {
              // Log error but don't fail the request
              console.error('Failed to log data access error:', logError);
            }
          }
        },
      }),
    );
  }

  private extractResourceType(request: any): string {
    // Extract from route or request body
    const route = request.route?.path || '';
    if (route.includes('patient')) return 'Patient';
    if (route.includes('medical-record')) return 'MedicalRecord';
    if (route.includes('consent')) return 'PatientConsentInstance';
    if (route.includes('case')) return 'SurgicalCase';
    return 'Unknown';
  }

  private extractResourceId(request: any): string | null {
    return request.params?.id || request.body?.id || null;
  }

  private extractAction(method: string): string {
    const methodMap: Record<string, string> = {
      GET: 'READ',
      POST: 'WRITE',
      PUT: 'WRITE',
      PATCH: 'WRITE',
      DELETE: 'DELETE',
    };
    return methodMap[method] || 'UNKNOWN';
  }

  private isPHIAccess(resourceType: string, action: string): boolean {
    const phiResourceTypes = [
      'Patient',
      'MedicalRecord',
      'ClinicalNote',
      'PatientConsentInstance',
      'SurgicalCase',
    ];
    return phiResourceTypes.includes(resourceType) && action === 'READ';
  }
}


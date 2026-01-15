import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { IdentityContextService } from '../../modules/auth/services/identityContext.service';
import { RlsValidationService } from '../../modules/audit/services/rlsValidation.service';
import { DataAccessLogService } from '../../modules/audit/services/dataAccessLog.service';

/**
 * Row-Level Security Guard
 * 
 * Ensures users can only access data they're authorized to view
 * based on RBAC permissions and resource ownership.
 * 
 * Validates resource access by checking:
 * - Resource ownership (primarySurgeonId, createdBy, etc.)
 * - Resource relationships (case assignments, department matches)
 * - Role-based access (ADMIN, BILLING, etc.)
 * 
 * Usage:
 * @UseGuards(RlsGuard)
 * @Get(':id')
 * findOne(@Param('id') id: string) { ... }
 * 
 * The guard automatically extracts resourceId from route params
 * and validates access based on the resource type inferred from the route.
 */
@Injectable()
export class RlsGuard implements CanActivate {
  private readonly logger = new Logger(RlsGuard.name);

  constructor(
    private identityContext: IdentityContextService,
    private rlsValidation: RlsValidationService,
    private dataAccessLogService: DataAccessLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const route = request.route?.path || request.path;
    const method = request.method;

    // Check authentication
    if (!this.identityContext.isAuthenticated()) {
      this.logger.warn('RLS check failed: User not authenticated');
      throw new ForbiddenException('User not authenticated');
    }

    const user = this.identityContext.getIdentity();
    const userId = user.id;

    // Skip RLS for public/system resources (templates, system config, etc.)
    // These resources don't have patient associations and are accessed by role/permission only
    if (this.shouldSkipRLS(route)) {
      this.logger.debug(`RLS skipped for route: ${route}`);
      return true;
    }

    // Extract resource ID from route parameters
    const resourceId = this.extractResourceId(request);
    const resourceType = this.inferResourceType(route);

    // If no resource ID in route, allow access (e.g., GET /patients - list endpoint)
    // List endpoints should be filtered in the service layer
    if (!resourceId) {
      return true;
    }

    // Validate resource access
    const hasAccess = await this.validateResourceAccess(
      resourceType,
      resourceId,
      userId,
      method,
    );

    // Log access attempt (non-blocking)
    this.logAccessAttempt(
      userId,
      resourceType,
      resourceId,
      method,
      hasAccess,
      request,
    ).catch((error) => {
      this.logger.error('Failed to log RLS access attempt', error);
    });

    if (!hasAccess) {
      this.logger.warn(
        `RLS check failed: User ${userId} attempted to access ${resourceType} ${resourceId} via ${method}`,
      );
      throw new ForbiddenException(
        `Access denied to ${resourceType} ${resourceId}`,
      );
    }

    return true;
  }

  /**
   * Check if route should skip RLS validation
   * Public/system resources that don't have patient associations
   */
  private shouldSkipRLS(route: string): boolean {
    // Template endpoints are public resources (system configuration)
    // They are protected by RolesGuard and PermissionsGuard only
    // Check both with and without API prefix (route might be '/consents/templates' or '/api/v1/consents/templates')
    const skipPaths = [
      '/consents/templates',
      '/consent/templates',
      '/templates',
      'consents/templates', // Without leading slash (in case route doesn't have it)
      'consent/templates',
      'templates',
    ];
    return skipPaths.some((skipPath) => route.includes(skipPath));
  }

  /**
   * Extract resource ID from request parameters
   * Supports multiple param naming conventions
   */
  private extractResourceId(request: any): string | null {
    const params = request.params || {};
    const id = params.id || 
               params.patientId ||  // Patient-specific routes
               params.patient_id || // Snake case variant
               params.caseId || 
               params.recordId || 
               params.billId || 
               params.consentId || 
               params.itemId ||
               params.intakeId ||   // Intake routes
               params.appointmentId; // Appointment routes
    return id || null;
  }

  /**
   * Infer resource type from route path
   * CRITICAL: All patient-related routes must return 'Patient' to trigger RLS
   */
  private inferResourceType(route: string): string {
    // Patient routes (including nested resources)
    if (route.includes('/patients')) return 'Patient';
    if (route.includes('/intake')) return 'Patient'; // Intake is patient-scoped
    if (route.includes('/consultations')) return 'Patient'; // Consultations are patient-scoped
    if (route.includes('/appointments')) return 'Patient'; // Appointments are patient-scoped
    if (route.includes('/emr')) return 'Patient'; // EMR notes are patient-scoped
    if (route.includes('/lab-orders')) return 'Patient'; // Lab orders are patient-scoped
    if (route.includes('/prescriptions')) return 'Patient'; // Prescriptions are patient-scoped
    
    // Non-patient resources
    if (route.includes('/theater/cases')) return 'SurgicalCase';
    if (route.includes('/medical-records')) return 'MedicalRecord';
    if (route.includes('/consent/instances')) return 'ConsentInstance';
    if (route.includes('/consents/') && !route.includes('/templates')) return 'PDFConsent';
    if (route.includes('/billing/bills')) return 'Bill';
    if (route.includes('/inventory/items')) return 'InventoryItem';
    
    return 'Unknown';
  }

  /**
   * Validate resource access based on type
   */
  private async validateResourceAccess(
    resourceType: string,
    resourceId: string,
    userId: string,
    method: string,
  ): Promise<boolean> {
    try {
      switch (resourceType) {
        case 'Patient':
          return await this.rlsValidation.canAccessPatient(resourceId, userId);

        case 'SurgicalCase':
          // For modification operations, check modify permissions
          if (method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
            return await this.rlsValidation.canModifySurgicalCase(
              resourceId,
              userId,
            );
          }
          // For read operations, check access permissions
          return await this.rlsValidation.canAccessSurgicalCase(
            resourceId,
            userId,
          );

        case 'MedicalRecord':
          // For modification operations, check modify permissions
          if (method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
            return await this.rlsValidation.canModifyMedicalRecord(
              resourceId,
              userId,
            );
          }
          // For read operations, check access permissions
          return await this.rlsValidation.canAccessMedicalRecord(
            resourceId,
            userId,
          );

        case 'ConsentInstance':
          return await this.rlsValidation.canAccessConsent(resourceId, userId);

        case 'PDFConsent':
          return await this.rlsValidation.canAccessPDFConsent(resourceId, userId);

        case 'Bill':
          return await this.rlsValidation.canAccessBill(resourceId, userId);

        case 'InventoryItem':
          // Inventory items: ADMIN and INVENTORY_MANAGER have full access
          // Others can read but not modify
          if (method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
            return (
              this.identityContext.hasRole('ADMIN') ||
              this.identityContext.hasRole('INVENTORY_MANAGER')
            );
          }
          // Read access for NURSE, DOCTOR, etc.
          return true; // Already checked by RolesGuard

        default:
          this.logger.warn(
            `Unknown resource type: ${resourceType}, defaulting to deny`,
          );
          return false;
      }
    } catch (error) {
      // If resource doesn't exist, NotFoundException will be thrown by service
      // If it's a different error, log and deny access
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error validating resource access for ${resourceType} ${resourceId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Log RLS access attempt for audit compliance
   */
  private async logAccessAttempt(
    userId: string,
    resourceType: string,
    resourceId: string,
    method: string,
    success: boolean,
    request: any,
  ): Promise<void> {
    const action = this.methodToAction(method);
    const accessedPHI = this.isPHIResource(resourceType);

    try {
      await this.dataAccessLogService.log({
        userId,
        resourceType,
        resourceId,
        action,
        ipAddress: request.ip || request.socket?.remoteAddress,
        userAgent: request.headers['user-agent'],
        sessionId: this.identityContext.getSessionId(),
        reason: `RLS validation: ${resourceType} access`,
        accessedPHI,
        success,
        errorMessage: success
          ? undefined
          : `Access denied to ${resourceType} ${resourceId}`,
      });
    } catch (error) {
      // Don't fail the request if logging fails
      this.logger.error('Failed to log RLS access attempt', error);
    }
  }

  /**
   * Convert HTTP method to action string
   */
  private methodToAction(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'READ';
      case 'POST':
        return 'CREATE';
      case 'PATCH':
      case 'PUT':
        return 'WRITE';
      case 'DELETE':
        return 'DELETE';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Determine if resource type contains PHI
   */
  private isPHIResource(resourceType: string): boolean {
    const phiResources = [
      'Patient',
      'MedicalRecord',
      'ConsentInstance',
      'Bill', // Contains patient financial info
    ];
    return phiResources.includes(resourceType);
  }
}

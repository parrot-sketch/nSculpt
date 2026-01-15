import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditRepository } from '../repositories/audit.repository';
import { AccessLogQueryDto } from '../dto/audit/access-log-query.dto';
import { DomainEventQueryDto } from '../dto/audit/domain-event-query.dto';
import { SessionQueryDto } from '../dto/audit/session-query.dto';
import { HipaaReportQueryDto } from '../dto/audit/hipaa-report-query.dto';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { SessionService } from '../../auth/services/session.service';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { Domain } from '@prisma/client';

/**
 * Audit Service
 * 
 * Business logic for audit and compliance workflows.
 * Provides read-only access to audit logs, events, and sessions.
 */
@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly dataAccessLogService: DataAccessLogService,
    private readonly sessionService: SessionService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
  ) {}

  /**
   * View data access logs
   * AC-001: View Data Access Logs
   */
  async viewAccessLogs(query: AccessLogQueryDto, adminId: string) {
    const result = await this.auditRepository.findAccessLogs({
      userId: query.userId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      action: query.action,
      accessedPHI: query.accessedPHI,
      success: query.success,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      skip: query.skip,
      take: query.take,
    });

    // Log access (meta-audit)
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'DataAccessLog',
      resourceId: 'list',
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin viewed data access logs',
      accessedPHI: false,
      success: true,
    });

    return result;
  }

  /**
   * View domain events
   * AC-002: View Domain Events
   */
  async viewDomainEvents(query: DomainEventQueryDto, adminId: string) {
    const result = await this.auditRepository.findDomainEvents({
      eventType: query.eventType,
      domain: query.domain,
      aggregateId: query.aggregateId,
      aggregateType: query.aggregateType,
      createdBy: query.createdBy,
      correlationId: query.correlationId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      skip: query.skip,
      take: query.take,
    });

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'DomainEvent',
      resourceId: 'list',
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin viewed domain events',
      accessedPHI: false,
      success: true,
    });

    return result;
  }

  /**
   * Get event chain (follow causation links)
   */
  async getEventChain(eventId: string, adminId: string) {
    const chain = await this.domainEventService.getEventChain(eventId);

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'DomainEvent',
      resourceId: eventId,
      action: 'READ_CHAIN',
      sessionId: context.sessionId,
      reason: 'Admin viewed event chain',
      accessedPHI: false,
      success: true,
    });

    return chain;
  }

  /**
   * Get correlated events (same workflow)
   */
  async getCorrelatedEvents(correlationId: string, adminId: string) {
    const events = await this.domainEventService.getCorrelatedEvents(correlationId);

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'DomainEvent',
      resourceId: correlationId,
      action: 'READ_CORRELATED',
      sessionId: context.sessionId,
      reason: 'Admin viewed correlated events',
      accessedPHI: false,
      success: true,
    });

    return events;
  }

  /**
   * View user sessions
   * AC-003: View User Sessions
   */
  async viewSessions(query: SessionQueryDto, adminId: string) {
    const result = await this.auditRepository.findSessions({
      userId: query.userId,
      active: query.active,
      revoked: query.revoked,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      skip: query.skip,
      take: query.take,
    });

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Session',
      resourceId: 'list',
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin viewed user sessions',
      accessedPHI: false,
      success: true,
    });

    return result;
  }

  /**
   * Revoke user session
   * AC-004: Revoke User Session
   */
  async revokeSession(sessionId: string, reason: string | undefined, adminId: string) {
    // Verify session exists
    const session = await this.sessionService.findById(sessionId);
    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.revokedAt) {
      throw new NotFoundException(`Session ${sessionId} is already revoked`);
    }

    // Revoke session
    await this.sessionService.revokeSession(sessionId, adminId, reason);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Session.Revoked',
      domain: Domain.AUDIT,
      aggregateId: sessionId,
      aggregateType: 'Session',
      payload: {
        userId: session.userId,
        revokedBy: adminId,
        reason,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Session',
      resourceId: sessionId,
      action: 'REVOKE',
      sessionId: context.sessionId,
      reason: `Admin revoked session: ${reason || 'No reason provided'}`,
      accessedPHI: false,
      success: true,
    });
  }

  /**
   * Generate HIPAA access report
   * AC-005: Generate HIPAA Access Report
   */
  async generateHipaaReport(query: HipaaReportQueryDto, adminId: string) {
    const report = await this.auditRepository.getHipaaAccessReport({
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate),
      userId: query.userId,
      resourceType: query.resourceType,
    });

    // Log report generation
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'HIPAAReport',
      resourceId: 'generated',
      action: 'GENERATE',
      sessionId: context.sessionId,
      reason: `Admin generated HIPAA access report for ${query.startDate} to ${query.endDate}`,
      accessedPHI: true, // Report contains PHI access information
      success: true,
    });

    return report;
  }
}





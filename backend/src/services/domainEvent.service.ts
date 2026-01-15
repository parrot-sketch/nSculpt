import { Injectable } from '@nestjs/common';
import { PrismaClient, DomainEvent, Domain } from '@prisma/client';
import { getPrismaClient } from '../prisma/client';
import * as crypto from 'crypto';
import { Subject } from 'rxjs';

export interface CreateEventParams {
  eventType: string;
  domain: Domain;
  aggregateId: string;
  aggregateType: string;
  payload: any;
  metadata?: any;
  causationId?: string;
  correlationId?: string;
  createdBy?: string;
  sessionId?: string;
  requestId?: string;
}

@Injectable()
export class DomainEventService {
  private prisma: PrismaClient;
  private eventSubject = new Subject<DomainEvent>();
  public event$ = this.eventSubject.asObservable();

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a domain event with strict validation and integrity checks
   * 
   * CRITICAL: This is the ONLY way to create events. Never use Prisma directly.
   */
  async createEvent(params: CreateEventParams): Promise<DomainEvent> {
    // 1. Validate event type pattern
    this.validateEventType(params.eventType);

    // 2. Validate causation/correlation references
    await this.validateEventReferences(params);

    // 3. Validate createdBy references existing user
    if (params.createdBy) {
      await this.validateUserExists(params.createdBy);
    }

    // 4. Compute content hash (MUST be done before INSERT)
    const occurredAt = new Date();
    const contentHash = this.computeContentHash({
      eventType: params.eventType,
      domain: params.domain,
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      payload: params.payload,
      metadata: params.metadata || null,
      occurredAt: occurredAt.toISOString(),
    });

    // 5. Create event (database triggers will validate hash)
    try {
      const event = await this.prisma.domainEvent.create({
        data: {
          eventType: params.eventType,
          domain: params.domain,
          aggregateId: params.aggregateId,
          aggregateType: params.aggregateType,
          payload: params.payload,
          metadata: params.metadata,
          causationId: params.causationId,
          correlationId: params.correlationId,
          createdBy: params.createdBy,
          sessionId: params.sessionId,
          requestId: params.requestId,
          occurredAt: occurredAt,
          contentHash: contentHash,
        },
      });

      // Emit event for real-time listeners
      this.eventSubject.next(event);

      return event;
    } catch (error: any) {
      // Wrap database errors with context
      if (error.code === 'P0001') {
        throw new Error(
          `Database validation failed: ${error.message}. ` +
          `This indicates a database-level immutability violation.`,
        );
      }
      throw error;
    }
  }

  /**
   * Verify event integrity by recomputing and comparing hash
   */
  async verifyEventIntegrity(eventId: string): Promise<boolean> {
    const event = await this.prisma.domainEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    const expectedHash = this.computeContentHash({
      eventType: event.eventType,
      domain: event.domain,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      payload: event.payload,
      metadata: event.metadata,
      occurredAt: event.occurredAt.toISOString(),
    });

    return event.contentHash === expectedHash;
  }

  /**
   * Verify integrity of all events in a time range
   */
  async verifyEventsIntegrity(
    startDate: Date,
    endDate: Date,
  ): Promise<{ eventId: string; valid: boolean }[]> {
    const events = await this.prisma.domainEvent.findMany({
      where: {
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const results = [];
    for (const event of events) {
      const isValid = await this.verifyEventIntegrity(event.id);
      results.push({ eventId: event.id, valid: isValid });
    }

    return results;
  }

  /**
   * Get event chain (follow causation links)
   */
  async getEventChain(eventId: string): Promise<DomainEvent[]> {
    const chain: DomainEvent[] = [];
    let currentEventId: string | null = eventId;

    while (currentEventId) {
      const event = await this.prisma.domainEvent.findUnique({
        where: { id: currentEventId },
      });

      if (!event) break;

      chain.push(event);
      currentEventId = event.causationId;
    }

    return chain.reverse(); // Return from root to current
  }

  /**
   * Get all events in a correlation (workflow)
   */
  async getCorrelatedEvents(correlationId: string): Promise<DomainEvent[]> {
    return await this.prisma.domainEvent.findMany({
      where: { correlationId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  // Private validation methods

  private validateEventType(eventType: string): void {
    // Pattern: DomainEntity.Action (e.g., "SurgicalCase.StatusChanged")
    const pattern = /^[A-Z][a-zA-Z0-9]*\.[A-Z][a-zA-Z0-9]*$/;
    if (!pattern.test(eventType)) {
      throw new Error(
        `Invalid eventType format: "${eventType}". ` +
        `Must match pattern: DomainEntity.Action (e.g., "SurgicalCase.StatusChanged")`,
      );
    }
  }

  private async validateEventReferences(params: CreateEventParams): Promise<void> {
    // Validate causationId references existing event
    if (params.causationId) {
      const causationEvent = await this.prisma.domainEvent.findUnique({
        where: { id: params.causationId },
      });

      if (!causationEvent) {
        throw new Error(
          `Invalid causationId: ${params.causationId}. Event does not exist.`,
        );
      }

      // Prevent self-reference
      if (params.causationId === params.aggregateId) {
        throw new Error('causationId cannot reference the same event being created');
      }
    }
  }

  private async validateUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error(`Invalid createdBy: ${userId}. User does not exist.`);
    }
  }

  /**
   * Compute SHA-256 content hash for event integrity
   */
  private computeContentHash(content: {
    eventType: string;
    domain: string;
    aggregateId: string;
    aggregateType: string;
    payload: any;
    metadata: any;
    occurredAt: string;
  }): string {
    // Construct content string (order MUST match database trigger)
    const contentString =
      content.eventType +
      '|' +
      content.domain +
      '|' +
      content.aggregateId +
      '|' +
      content.aggregateType +
      '|' +
      JSON.stringify(content.payload) +
      '|' +
      (content.metadata ? JSON.stringify(content.metadata) : '') +
      '|' +
      content.occurredAt;

    // Compute SHA-256 hash
    return crypto.createHash('sha256').update(contentString, 'utf8').digest('hex');
  }
}













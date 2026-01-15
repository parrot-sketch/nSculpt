/**
 * Consultation State Machine Service
 * 
 * Enforces valid state transitions for consultations.
 * Ensures business rules are followed during status changes.
 * 
 * State Flow:
 * SCHEDULED → IN_PROGRESS → COMPLETED | REQUIRES_FOLLOW_UP
 *     ↓           ↓
 * CANCELLED   CANCELLED
 * 
 * @domain-service
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConsultationStatus } from '../entities/consultation.entity';

export interface StateTransitionContext {
  consultationId: string;
  currentStatus: ConsultationStatus;
  targetStatus: ConsultationStatus;
  doctorId: string;
  reason?: string;
}

@Injectable()
export class ConsultationStateMachineService {
  private readonly logger = new Logger(ConsultationStateMachineService.name);

  /**
   * Allowed state transitions map
   */
  private readonly ALLOWED_TRANSITIONS: Record<
    ConsultationStatus,
    ConsultationStatus[]
  > = {
    [ConsultationStatus.SCHEDULED]: [
      ConsultationStatus.IN_PROGRESS,
      ConsultationStatus.CANCELLED,
    ],
    [ConsultationStatus.IN_PROGRESS]: [
      ConsultationStatus.COMPLETED,
      ConsultationStatus.REQUIRES_FOLLOW_UP,
      ConsultationStatus.CANCELLED,
    ],
    [ConsultationStatus.COMPLETED]: [
      // Terminal state - no transitions
    ],
    [ConsultationStatus.REQUIRES_FOLLOW_UP]: [
      // Terminal state - follow-up will create new consultation
    ],
    [ConsultationStatus.CANCELLED]: [
      // Terminal state - no transitions
    ],
  };

  /**
   * Terminal states that cannot be changed
   */
  private readonly TERMINAL_STATES: ConsultationStatus[] = [
    ConsultationStatus.COMPLETED,
    ConsultationStatus.REQUIRES_FOLLOW_UP,
    ConsultationStatus.CANCELLED,
  ];

  /**
   * Validate state transition
   * 
   * @throws Error if transition is not allowed
   */
  validateTransition(context: StateTransitionContext): void {
    const { consultationId, currentStatus, targetStatus } = context;

    // Check if same state (idempotent)
    if (currentStatus === targetStatus) {
      this.logger.log(
        `Idempotent state transition for consultation ${consultationId}: ${currentStatus}`,
      );
      return;
    }

    // Check if current state is terminal
    if (this.isTerminalState(currentStatus)) {
      throw new Error(
        `Cannot transition from terminal state ${currentStatus} to ${targetStatus} for consultation ${consultationId}`,
      );
    }

    // Check if transition is allowed
    const allowedNextStates = this.ALLOWED_TRANSITIONS[currentStatus];
    if (!allowedNextStates || !allowedNextStates.includes(targetStatus)) {
      const allowedStatesStr =
        allowedNextStates?.join(', ') || 'none (terminal state)';
      throw new Error(
        `Invalid state transition for consultation ${consultationId}: ` +
          `${currentStatus} → ${targetStatus}. ` +
          `Allowed transitions: ${allowedStatesStr}`,
      );
    }

    this.logger.log(
      `Valid state transition for consultation ${consultationId}: ${currentStatus} → ${targetStatus}`,
    );
  }

  /**
   * Check if status is terminal
   */
  isTerminalState(status: ConsultationStatus): boolean {
    return this.TERMINAL_STATES.includes(status);
  }

  /**
   * Check if status allows clinical updates
   */
  canUpdateClinicalData(status: ConsultationStatus): boolean {
    return (
      status === ConsultationStatus.SCHEDULED ||
      status === ConsultationStatus.IN_PROGRESS
    );
  }

  /**
   * Check if status allows cancellation
   */
  canBeCancelled(status: ConsultationStatus): boolean {
    return (
      status === ConsultationStatus.SCHEDULED ||
      status === ConsultationStatus.IN_PROGRESS
    );
  }

  /**
   * Get next available states
   */
  getNextStates(currentStatus: ConsultationStatus): ConsultationStatus[] {
    return this.ALLOWED_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Check if consultation can be billed
   */
  canBeBilled(status: ConsultationStatus): boolean {
    return (
      status === ConsultationStatus.COMPLETED ||
      status === ConsultationStatus.REQUIRES_FOLLOW_UP
    );
  }

  /**
   * Validate business rules for specific transitions
   */
  validateBusinessRules(context: StateTransitionContext): void {
    const { targetStatus, reason } = context;

    // Cancellation requires reason
    if (
      targetStatus === ConsultationStatus.CANCELLED &&
      (!reason || reason.trim().length === 0)
    ) {
      throw new Error('Cancellation reason is required');
    }

    // Completion requires diagnosis (validated in entity)
    // Follow-up requires future date (validated in entity)
  }

  /**
   * Get human-readable status description
   */
  getStatusDescription(status: ConsultationStatus): string {
    const descriptions: Record<ConsultationStatus, string> = {
      [ConsultationStatus.SCHEDULED]:
        'Consultation is scheduled and awaiting doctor',
      [ConsultationStatus.IN_PROGRESS]: 'Doctor is currently with patient',
      [ConsultationStatus.COMPLETED]:
        'Consultation completed with all documentation',
      [ConsultationStatus.REQUIRES_FOLLOW_UP]:
        'Consultation completed, follow-up appointment required',
      [ConsultationStatus.CANCELLED]: 'Consultation was cancelled',
    };

    return descriptions[status] || 'Unknown status';
  }

  /**
   * Get allowed actions for current status
   */
  getAllowedActions(status: ConsultationStatus): string[] {
    const actions: string[] = [];

    if (status === ConsultationStatus.SCHEDULED) {
      actions.push('start', 'cancel');
    } else if (status === ConsultationStatus.IN_PROGRESS) {
      actions.push('update_clinical_data', 'complete', 'cancel');
    }

    return actions;
  }
}



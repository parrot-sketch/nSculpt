/**
 * Patient Lifecycle State Enum
 * 
 * Authoritative state machine for patient progression through clinical workflow.
 * This enum defines the canonical lifecycle states that all services must respect.
 * 
 * Lifecycle Flow:
 * REGISTERED → VERIFIED → INTAKE_IN_PROGRESS → INTAKE_COMPLETED → 
 * INTAKE_VERIFIED → CONSULTATION_REQUESTED → CONSULTATION_APPROVED → 
 * APPOINTMENT_SCHEDULED → CONSULTATION_COMPLETED → PROCEDURE_PLANNED → 
 * CONSENT_SIGNED → SURGERY_SCHEDULED → SURGERY_COMPLETED → FOLLOW_UP → DISCHARGED
 * 
 * @domain Patient
 */

export enum PatientLifecycleState {
  REGISTERED = 'REGISTERED',
  EXPLORING = 'EXPLORING',
  VERIFIED = 'VERIFIED',
  INTAKE_IN_PROGRESS = 'INTAKE_IN_PROGRESS',
  INTAKE_COMPLETED = 'INTAKE_COMPLETED',
  INTAKE_VERIFIED = 'INTAKE_VERIFIED',
  CONSULTATION_REQUESTED = 'CONSULTATION_REQUESTED',
  CONSULTATION_APPROVED = 'CONSULTATION_APPROVED',
  APPOINTMENT_SCHEDULED = 'APPOINTMENT_SCHEDULED',
  CONSULTATION_COMPLETED = 'CONSULTATION_COMPLETED',
  PROCEDURE_PLANNED = 'PROCEDURE_PLANNED',
  CONSENT_SIGNED = 'CONSENT_SIGNED',
  SURGERY_SCHEDULED = 'SURGERY_SCHEDULED',
  SURGERY_COMPLETED = 'SURGERY_COMPLETED',
  FOLLOW_UP = 'FOLLOW_UP',
  DISCHARGED = 'DISCHARGED',
}

/**
 * Terminal states that cannot be transitioned from
 */
export const TERMINAL_STATES: PatientLifecycleState[] = [
  PatientLifecycleState.DISCHARGED,
];

/**
 * Human-readable descriptions for each state
 */
export const STATE_DESCRIPTIONS: Record<PatientLifecycleState, string> = {
  [PatientLifecycleState.REGISTERED]: 'Patient has registered but not yet verified',
  [PatientLifecycleState.EXPLORING]: 'Patient is exploring clinical services and experts',
  [PatientLifecycleState.VERIFIED]: 'Patient identity has been verified',
  [PatientLifecycleState.INTAKE_IN_PROGRESS]: 'Patient is completing intake forms',
  [PatientLifecycleState.INTAKE_COMPLETED]: 'Patient has completed intake forms',
  [PatientLifecycleState.INTAKE_VERIFIED]: 'Intake forms have been verified by staff',
  [PatientLifecycleState.CONSULTATION_REQUESTED]: 'Patient has requested a consultation',
  [PatientLifecycleState.CONSULTATION_APPROVED]: 'Consultation request has been approved',
  [PatientLifecycleState.APPOINTMENT_SCHEDULED]: 'Appointment has been scheduled',
  [PatientLifecycleState.CONSULTATION_COMPLETED]: 'Consultation has been completed',
  [PatientLifecycleState.PROCEDURE_PLANNED]: 'Procedure plan has been created',
  [PatientLifecycleState.CONSENT_SIGNED]: 'Consent forms have been signed',
  [PatientLifecycleState.SURGERY_SCHEDULED]: 'Surgery has been scheduled',
  [PatientLifecycleState.SURGERY_COMPLETED]: 'Surgery has been completed',
  [PatientLifecycleState.FOLLOW_UP]: 'Patient is in follow-up care',
  [PatientLifecycleState.DISCHARGED]: 'Patient has been discharged',
};

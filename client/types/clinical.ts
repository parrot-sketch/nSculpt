export type UUID = string;

// Enums matching Backend
export enum EncounterStatus {
    PLANNED = 'PLANNED',
    ARRIVED = 'ARRIVED',
    IN_PROGRESS = 'IN_PROGRESS',
    FINISHED = 'FINISHED',
    CANCELLED = 'CANCELLED',
}

export enum EncounterClass {
    AMBULATORY = 'AMBULATORY',
    INPATIENT = 'INPATIENT',
    SURGICAL = 'SURGICAL',
    EMERGENCY = 'EMERGENCY',
    VIRTUAL = 'VIRTUAL',
}

export enum ObservationStatus {
    PRELIMINARY = 'PRELIMINARY',
    FINAL = 'FINAL',
    AMENDED = 'AMENDED',
    ENTERED_IN_ERROR = 'ENTERED_IN_ERROR',
}

export enum ConditionClinicalStatus {
    ACTIVE = 'ACTIVE',
    RECURRENCE = 'RECURRENCE',
    RELAPSE = 'RELAPSE',
    INACTIVE = 'INACTIVE',
    REMISSION = 'REMISSION',
    RESOLVED = 'RESOLVED',
}

export enum ConditionVerificationStatus {
    UNCONFIRMED = 'UNCONFIRMED',
    PROVISIONAL = 'PROVISIONAL',
    DIFFERENTIAL = 'DIFFERENTIAL',
    CONFIRMED = 'CONFIRMED',
    REFUTED = 'REFUTED',
    ENTERED_IN_ERROR = 'ENTERED_IN_ERROR',
}

export interface UserShort {
    id: UUID;
    firstName: string;
    lastName: string;
    role: string;
}

// Core Models
export interface Encounter {
    id: UUID;
    patientId: UUID;
    status: EncounterStatus;
    class: EncounterClass;
    type: string;

    periodStart: string; // ISO DateTime
    periodEnd?: string;

    // Context
    locationId?: UUID;
    serviceProviderId: UUID;

    // Safety & Locking
    locked: boolean;
    lockedAt?: string;
    lockedById?: UUID;
    lockedBy?: UserShort;

    // Audit
    createdById: UUID;
    updatedById?: UUID;
    createdAt: string;
    updatedAt: string;
}

export interface Observation {
    id: UUID;
    patientId: UUID;
    encounterId?: UUID;

    status: ObservationStatus;
    category: string;
    code: string;
    display: string;

    valueQuantity?: number;
    valueUnit?: string;
    valueString?: string;

    effectiveDateTime: string;
    performerId?: UUID;

    // Versioning
    isLatest: boolean;
    version: number;
    previousVersionId?: UUID;

    createdById: UUID;
    createdAt: string;
}

export interface Condition {
    id: UUID;
    patientId: UUID;
    encounterId?: UUID;

    clinicalStatus: ConditionClinicalStatus;
    verificationStatus: ConditionVerificationStatus;

    category: string;
    severity?: string;
    code: string;
    display: string;

    onsetDate?: string;
    abatementDate?: string;
    note?: string;

    isLatest: boolean;
    version: number;
}

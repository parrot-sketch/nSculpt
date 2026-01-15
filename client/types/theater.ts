export interface SurgicalCase {
  id: string;
  caseNumber: string;
  patientId: string;
  procedureName: string;
  procedureCode?: string;
  description?: string;
  estimatedDurationMinutes?: number;
  priority?: number;
  status: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  primarySurgeonId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}













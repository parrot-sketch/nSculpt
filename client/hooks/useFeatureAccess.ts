'use client';

import { usePermissions } from './usePermissions';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';
import { buildPermission } from '@/lib/permissions';

/**
 * Hook for feature-level access control
 * Provides convenient methods to check access to specific features
 */
export function useFeatureAccess() {
  const { hasPermission, hasAnyPermission } = usePermissions();

  return {
    // Medical Records
    canReadMedicalRecords: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.MEDICAL_RECORDS, '*', PERMISSION_ACTIONS.READ)),
    canWriteMedicalRecords: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.MEDICAL_RECORDS, '*', PERMISSION_ACTIONS.WRITE)),

    // Patients
    canReadPatients: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ)),
    canWritePatients: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.WRITE)),
    canDeletePatients: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.DELETE)),

    // Theater
    canReadTheater: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.THEATER, '*', PERMISSION_ACTIONS.READ)),
    canBookTheater: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.THEATER, '*', PERMISSION_ACTIONS.BOOK)),
    canManageTheater: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.THEATER, '*', PERMISSION_ACTIONS.MANAGE)),

    // Inventory
    canReadInventory: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.INVENTORY, '*', PERMISSION_ACTIONS.READ)),
    canWriteInventory: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.INVENTORY, '*', PERMISSION_ACTIONS.WRITE)),
    canManageInventory: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.INVENTORY, '*', PERMISSION_ACTIONS.MANAGE)),

    // Billing
    canReadBilling: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.BILLING, '*', PERMISSION_ACTIONS.READ)),
    canWriteBilling: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.BILLING, '*', PERMISSION_ACTIONS.WRITE)),
    canApproveBilling: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.BILLING, '*', PERMISSION_ACTIONS.APPROVE)),

    // Consent
    canReadConsent: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.CONSENT, '*', PERMISSION_ACTIONS.READ)),
    canWriteConsent: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.CONSENT, '*', PERMISSION_ACTIONS.WRITE)),

    // Audit
    canReadAudit: () =>
      hasPermission(buildPermission(PERMISSION_DOMAINS.AUDIT, '*', PERMISSION_ACTIONS.READ)),
  };
}













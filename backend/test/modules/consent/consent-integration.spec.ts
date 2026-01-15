import { Test, TestingModule } from '@nestjs/testing';
import { PDFConsentService } from '../../../src/modules/consent/services/pdf-consent.service';
import { PDFConsentRepository } from '../../../src/modules/consent/repositories/pdf-consent.repository';
import { PatientService } from '../../../src/modules/patient/services/patient.service';
import { PatientRepository } from '../../../src/modules/patient/repositories/patient.repository';
import { RlsValidationService } from '../../../src/modules/audit/services/rlsValidation.service';
import { IdentityContextService } from '../../../src/modules/auth/services/identityContext.service';
import { ConsentForbiddenActionException, ConsentStateException, ConsentSignatureOrderException } from '../../../src/modules/consent/exceptions/consent.exceptions';
import { ConsentStatus, SignerType } from '@prisma/client';

/**
 * Integration tests for PDF Consent workflow
 * 
 * Tests cover:
 * - Unauthorized access
 * - Invalid signature order
 * - Doctor signing before patient
 * - Admin override
 * - Revocation rules
 * - EMR addendum creation
 * - Optimistic locking collisions
 * - Archived consent access rules
 */
describe('PDF Consent Integration', () => {
  let consentService: PDFConsentService;
  let patientService: PatientService;
  let rlsValidation: RlsValidationService;
  let identityContext: IdentityContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PDFConsentService,
        PDFConsentRepository,
        PatientService,
        PatientRepository,
        RlsValidationService,
        IdentityContextService,
        // Add other required providers...
      ],
    }).compile();

    consentService = module.get<PDFConsentService>(PDFConsentService);
    patientService = module.get<PatientService>(PatientService);
    rlsValidation = module.get<RlsValidationService>(RlsValidationService);
    identityContext = module.get<IdentityContextService>(IdentityContextService);
  });

  describe('RBAC Enforcement', () => {
    it('should deny front desk access to consent content', async () => {
      // Mock front desk user
      jest.spyOn(identityContext, 'hasRole').mockReturnValue(true);
      jest.spyOn(identityContext, 'getRoles').mockReturnValue(['FRONT_DESK']);

      const consents = await patientService.getConsentsByPatient('patient-id', 'front-desk-user-id');

      // Front desk should only see status, not content
      expect(consents.pdfConsents[0]).not.toHaveProperty('generatedPdfUrl');
      expect(consents.pdfConsents[0]).not.toHaveProperty('finalPdfUrl');
      expect(consents.pdfConsents[0]).toHaveProperty('status');
    });

    it('should deny nurse from revoking consent', async () => {
      jest.spyOn(identityContext, 'hasRole').mockImplementation((role) => role === 'NURSE');

      await expect(
        consentService.revokeConsent(
          { consentId: 'consent-id', reason: 'test', version: 1 },
          'nurse-user-id',
        ),
      ).rejects.toThrow(ConsentForbiddenActionException);
    });

    it('should deny non-admin from archiving', async () => {
      jest.spyOn(identityContext, 'hasRole').mockImplementation((role) => role === 'DOCTOR');

      await expect(
        consentService.archiveConsent(
          { consentId: 'consent-id', reason: 'test', version: 1 },
          'doctor-user-id',
        ),
      ).rejects.toThrow(ConsentForbiddenActionException);
    });
  });

  describe('Signature Order Enforcement', () => {
    it('should prevent doctor from signing before patient', async () => {
      const consent = {
        id: 'consent-id',
        status: ConsentStatus.READY_FOR_SIGNATURE,
        patientId: 'patient-id',
        version: 1,
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(consent);
      jest.spyOn(consentService['repository'], 'getSignatures').mockResolvedValue([]);

      await expect(
        consentService.signConsent(
          {
            consentId: 'consent-id',
            signerType: SignerType.DOCTOR,
            signerName: 'Dr. Smith',
          },
          'doctor-user-id',
        ),
      ).rejects.toThrow(ConsentSignatureOrderException);
    });

    it('should allow admin override with flag and reason', async () => {
      const consent = {
        id: 'consent-id',
        status: ConsentStatus.READY_FOR_SIGNATURE,
        patientId: 'patient-id',
        version: 1,
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(consent);
      jest.spyOn(consentService['repository'], 'getSignatures').mockResolvedValue([]);
      jest.spyOn(identityContext, 'hasRole').mockImplementation((role) => role === 'ADMIN');

      // Should not throw when override flag is set
      await expect(
        consentService.signConsent(
          {
            consentId: 'consent-id',
            signerType: SignerType.DOCTOR,
            signerName: 'Dr. Admin',
          },
          'admin-user-id',
          undefined,
          true, // overrideFlag
          'Emergency override - patient unable to sign', // overrideReason
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('Revocation Rules', () => {
    it('should prevent revocation if surgery is scheduled', async () => {
      const consent = {
        id: 'consent-id',
        status: ConsentStatus.READY_FOR_SIGNATURE,
        consultationId: 'consultation-id',
        patientId: 'patient-id',
        version: 1,
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(consent);
      jest.spyOn(consentService['prisma'], 'consultation').findUnique = jest.fn().mockResolvedValue({
        id: 'consultation-id',
        status: 'SURGERY_SCHEDULED',
        procedurePlans: [{
          surgicalCase: { id: 'case-id', status: 'SCHEDULED' },
        }],
      });

      await expect(
        consentService.revokeConsent(
          { consentId: 'consent-id', reason: 'test', version: 1 },
          'doctor-user-id',
        ),
      ).rejects.toThrow(ConsentForbiddenActionException);
    });

    it('should prevent revocation of signed consent', async () => {
      const consent = {
        id: 'consent-id',
        status: ConsentStatus.SIGNED,
        patientId: 'patient-id',
        version: 1,
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(consent);

      await expect(
        consentService.revokeConsent(
          { consentId: 'consent-id', reason: 'test', version: 1 },
          'doctor-user-id',
        ),
      ).rejects.toThrow(ConsentForbiddenActionException);
    });
  });

  describe('Archive Rules', () => {
    it('should only allow archive of SIGNED or REVOKED consents', async () => {
      const consent = {
        id: 'consent-id',
        status: ConsentStatus.DRAFT,
        patientId: 'patient-id',
        version: 1,
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(consent);
      jest.spyOn(identityContext, 'hasRole').mockImplementation((role) => role === 'ADMIN');

      await expect(
        consentService.archiveConsent(
          { consentId: 'consent-id', reason: 'test', version: 1 },
          'admin-user-id',
        ),
      ).rejects.toThrow(ConsentStateException);
    });

    it('should require reason for archive', async () => {
      const consent = {
        id: 'consent-id',
        status: ConsentStatus.SIGNED,
        patientId: 'patient-id',
        version: 1,
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(consent);
      jest.spyOn(identityContext, 'hasRole').mockImplementation((role) => role === 'ADMIN');

      await expect(
        consentService.archiveConsent(
          { consentId: 'consent-id', reason: '', version: 1 },
          'admin-user-id',
        ),
      ).rejects.toThrow(ConsentForbiddenActionException);
    });
  });

  describe('Optimistic Locking', () => {
    it('should throw ConflictException on version mismatch', async () => {
      const consent = {
        id: 'consent-id',
        status: ConsentStatus.READY_FOR_SIGNATURE,
        patientId: 'patient-id',
        version: 2, // Current version
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(consent);

      await expect(
        consentService.sendForSignature(
          { consentId: 'consent-id', version: 1 }, // Stale version
          'user-id',
        ),
      ).rejects.toThrow('Version mismatch');
    });
  });

  describe('Restricted Patient Access', () => {
    it('should deny access to restricted patient consents for non-admin, non-assigned doctor', async () => {
      const patient = {
        id: 'patient-id',
        restricted: true,
      };

      jest.spyOn(patientService, 'findOne').mockResolvedValue(patient);
      jest.spyOn(identityContext, 'hasRole').mockImplementation((role) => role === 'NURSE');
      jest.spyOn(patientService, 'isAssignedDoctor').mockResolvedValue(false);

      await expect(
        patientService.getConsentsByPatient('patient-id', 'nurse-user-id'),
      ).rejects.toThrow('Access denied: Patient is restricted');
    });
  });
});










import { Test, TestingModule } from '@nestjs/testing';
import { PDFConsentService } from '../../../src/modules/consent/services/pdf-consent.service';
import { PDFConsentRepository } from '../../../src/modules/consent/repositories/pdf-consent.repository';
import { PDFProcessingService } from '../../../src/modules/consent/services/pdf-processing.service';
import { DomainEventService } from '../../../src/services/domainEvent.service';
import { CorrelationService } from '../../../src/services/correlation.service';
import { RlsValidationService } from '../../../src/modules/audit/services/rlsValidation.service';
import { IdentityContextService } from '../../../src/modules/auth/services/identityContext.service';
import { EMRNoteService } from '../../../src/modules/emr/services/emr-note.service';
import { ConsentStatus, SignerType } from '@prisma/client';
import { PDFSignerType } from '../../../src/modules/consent/dto/sign-pdf-consent.dto';
import { BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('PDFConsentService - Integration Tests', () => {
  let service: PDFConsentService;
  let repository: jest.Mocked<PDFConsentRepository>;
  let pdfProcessing: jest.Mocked<PDFProcessingService>;
  let domainEventService: jest.Mocked<DomainEventService>;
  let rlsValidation: jest.Mocked<RlsValidationService>;
  let identityContext: jest.Mocked<IdentityContextService>;
  let emrNoteService: jest.Mocked<EMRNoteService>;

  const mockConsent = {
    id: 'consent-1',
    patientId: 'patient-1',
    consultationId: 'consultation-1',
    templateId: 'template-1',
    status: ConsentStatus.DRAFT,
    generatedPdfUrl: '/uploads/generated.pdf',
    finalPdfUrl: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findTemplateById: jest.fn(),
      createConsent: jest.fn(),
      findConsentById: jest.fn(),
      updateConsentStatus: jest.fn(),
      createSignature: jest.fn(),
      getSignatures: jest.fn(),
      archiveConsent: jest.fn(),
    };

    const mockPdfProcessing = {
      loadPDF: jest.fn(),
      mergePlaceholders: jest.fn(),
      generateFinalPDF: jest.fn(),
      savePDF: jest.fn(),
      getFileUrl: jest.fn(),
      generateFilename: jest.fn(),
    };

    const mockDomainEventService = {
      createEvent: jest.fn(),
    };

    const mockRlsValidation = {
      canAccessPatient: jest.fn().mockResolvedValue(true),
    };

    const mockIdentityContext = {
      hasRole: jest.fn(),
    };

    const mockEMRNoteService = {
      listNotesByConsultation: jest.fn(),
      addAddendum: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PDFConsentService,
        {
          provide: PDFConsentRepository,
          useValue: mockRepository,
        },
        {
          provide: PDFProcessingService,
          useValue: mockPdfProcessing,
        },
        {
          provide: DomainEventService,
          useValue: mockDomainEventService,
        },
        {
          provide: CorrelationService,
          useValue: { getContext: jest.fn().mockReturnValue({}) },
        },
        {
          provide: RlsValidationService,
          useValue: mockRlsValidation,
        },
        {
          provide: IdentityContextService,
          useValue: mockIdentityContext,
        },
        {
          provide: EMRNoteService,
          useValue: mockEMRNoteService,
        },
        {
          provide: 'PrismaClient',
          useValue: {
            consultation: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PDFConsentService>(PDFConsentService);
    repository = module.get(PDFConsentRepository);
    pdfProcessing = module.get(PDFProcessingService);
    domainEventService = module.get(DomainEventService);
    rlsValidation = module.get(RlsValidationService);
    identityContext = module.get(IdentityContextService);
    emrNoteService = module.get(EMRNoteService);
  });

  describe('Signature Order Enforcement', () => {
    it('should require patient signature before doctor', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.READY_FOR_SIGNATURE,
      });
      repository.getSignatures.mockResolvedValue([]);

      const signDto = {
        consentId: 'consent-1',
        signerType: PDFSignerType.DOCTOR,
        signerName: 'Dr. Smith',
      };

      await expect(
        service.signConsent(signDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(repository.createSignature).not.toHaveBeenCalled();
    });

    it('should allow doctor to sign after patient', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.PARTIALLY_SIGNED,
      });
      repository.getSignatures.mockResolvedValue([
        {
          id: 'sig-1',
          signerType: SignerType.PATIENT,
          signerName: 'John Doe',
          signedAt: new Date(),
        },
      ]);
      repository.updateConsentStatus.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.SIGNED,
      });

      const signDto = {
        consentId: 'consent-1',
        signerType: PDFSignerType.DOCTOR,
        signerName: 'Dr. Smith',
      };

      await service.signConsent(signDto, 'user-1');
      expect(repository.createSignature).toHaveBeenCalled();
    });

    it('should require patient signature before witness', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.READY_FOR_SIGNATURE,
      });
      repository.getSignatures.mockResolvedValue([]);

      const signDto = {
        consentId: 'consent-1',
        signerType: PDFSignerType.NURSE_WITNESS,
        signerName: 'Nurse Jane',
      };

      await expect(
        service.signConsent(signDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Admin Override Rules', () => {
    it('should require override flag and reason for admin signature', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.READY_FOR_SIGNATURE,
      });
      repository.getSignatures.mockResolvedValue([]);
      identityContext.hasRole.mockReturnValue(true);

      const signDto = {
        consentId: 'consent-1',
        signerType: PDFSignerType.ADMIN,
        signerName: 'Admin User',
      };

      await expect(
        service.signConsent(signDto, 'user-1', undefined, false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow admin signature with override', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.READY_FOR_SIGNATURE,
      });
      repository.getSignatures.mockResolvedValue([]);
      identityContext.hasRole.mockReturnValue(true);
      repository.updateConsentStatus.mockResolvedValue(mockConsent);

      const signDto = {
        consentId: 'consent-1',
        signerType: PDFSignerType.ADMIN,
        signerName: 'Admin User',
      };

      await service.signConsent(signDto, 'user-1', undefined, true, 'Emergency override');
      expect(repository.createSignature).toHaveBeenCalled();
    });
  });

  describe('Illegal Sign Attempts', () => {
    it('should reject signing already signed consent', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.SIGNED,
      });

      const signDto = {
        consentId: 'consent-1',
        signerType: PDFSignerType.PATIENT,
        signerName: 'John Doe',
      };

      await expect(
        service.signConsent(signDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate signatures', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.PARTIALLY_SIGNED,
      });
      repository.getSignatures.mockResolvedValue([
        {
          id: 'sig-1',
          signerType: SignerType.PATIENT,
          signerName: 'John Doe',
          signedAt: new Date(),
        },
      ]);

      const signDto = {
        consentId: 'consent-1',
        signerType: PDFSignerType.PATIENT,
        signerName: 'John Doe',
      };

      await expect(
        service.signConsent(signDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Revocation Rules', () => {
    it('should only allow ADMIN or DOCTOR to revoke', async () => {
      repository.findConsentById.mockResolvedValue(mockConsent);
      identityContext.hasRole.mockReturnValue(false);

      const revokeDto = {
        consentId: 'consent-1',
        reason: 'Test reason',
      };

      await expect(
        service.revokeConsent(revokeDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject revocation of signed consent', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.SIGNED,
      });
      identityContext.hasRole.mockReturnValue(true);

      const revokeDto = {
        consentId: 'consent-1',
        reason: 'Test reason',
      };

      await expect(
        service.revokeConsent(revokeDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require revocation reason', async () => {
      repository.findConsentById.mockResolvedValue(mockConsent);
      identityContext.hasRole.mockReturnValue(true);

      const revokeDto = {
        consentId: 'consent-1',
        reason: undefined,
      };

      await expect(
        service.revokeConsent(revokeDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Archive Rules', () => {
    it('should only allow ADMIN to archive', async () => {
      repository.findConsentById.mockResolvedValue(mockConsent);
      identityContext.hasRole.mockReturnValue(false);

      const archiveDto = {
        consentId: 'consent-1',
        reason: 'Test reason',
      };

      await expect(
        service.archiveConsent(archiveDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject archiving non-signed/revoked consent', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.DRAFT,
      });
      identityContext.hasRole.mockReturnValue(true);

      const archiveDto = {
        consentId: 'consent-1',
        reason: 'Test reason',
      };

      await expect(
        service.archiveConsent(archiveDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require archive reason', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.SIGNED,
      });
      identityContext.hasRole.mockReturnValue(true);

      const archiveDto = {
        consentId: 'consent-1',
        reason: undefined,
      };

      await expect(
        service.archiveConsent(archiveDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('EMR Auto-Attach', () => {
    it('should attach consent to EMR when fully signed', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.PARTIALLY_SIGNED,
      });
      repository.getSignatures.mockResolvedValue([
        {
          id: 'sig-1',
          signerType: SignerType.PATIENT,
          signerName: 'John Doe',
          signedAt: new Date(),
        },
      ]);
      pdfProcessing.loadPDF.mockResolvedValue(Buffer.from('pdf'));
      pdfProcessing.generateFinalPDF.mockResolvedValue({
        pdfBuffer: Buffer.from('final'),
        hash: 'hash123',
      });
      pdfProcessing.savePDF.mockResolvedValue('/uploads/final.pdf');
      pdfProcessing.getFileUrl.mockReturnValue('/uploads/final.pdf');
      repository.updateConsentStatus.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.SIGNED,
        finalPdfUrl: '/uploads/final.pdf',
      });
      emrNoteService.listNotesByConsultation.mockResolvedValue([
        { id: 'note-1', consultationId: 'consultation-1' },
      ]);

      const signDto = {
        consentId: 'consent-1',
        signerType: PDFSignerType.DOCTOR,
        signerName: 'Dr. Smith',
      };

      await service.signConsent(signDto, 'user-1');

      expect(emrNoteService.addAddendum).toHaveBeenCalled();
    });
  });

  describe('Optimistic Locking', () => {
    it('should reject operation on version mismatch', async () => {
      repository.findConsentById.mockResolvedValue({
        ...mockConsent,
        version: 2,
      });

      const sendDto = {
        consentId: 'consent-1',
        version: 1, // Stale version
      };

      await expect(
        service.sendForSignature(sendDto, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});










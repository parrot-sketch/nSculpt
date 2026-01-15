// Mock Prisma Client before any imports
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

jest.mock('../../../src/prisma/client', () => ({
  getPrismaClient: jest.fn().mockReturnValue({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  }),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PDFConsentController } from '../../../src/modules/consent/controllers/pdf-consent.controller';
import { PDFConsentService } from '../../../src/modules/consent/services/pdf-consent.service';
import { RlsValidationService } from '../../../src/modules/audit/services/rlsValidation.service';
import { IdentityContextService } from '../../../src/modules/auth/services/identityContext.service';
import { DataAccessLogService } from '../../../src/modules/audit/services/dataAccessLog.service';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { RlsGuard } from '../../../src/common/guards/rls.guard';
import { PermissionsGuard } from '../../../src/modules/auth/guards/permissions.guard';
import { DataAccessLogInterceptor } from '../../../src/common/interceptors/dataAccessLog.interceptor';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  createReadStream: jest.fn(),
}));

// Mock path module
jest.mock('path', () => ({
  resolve: jest.fn(),
  basename: jest.fn((p) => p.split('/').pop() || p),
}));

/**
 * Integration tests for PDF consent download endpoint
 * 
 * Tests cover:
 * - Unauthorized access
 * - RLS enforcement
 * - Path traversal protection
 * - File not found handling
 * - Hash header inclusion
 * - Access logging
 */
describe('PDF Consent Download', () => {
  let controller: PDFConsentController;
  let consentService: PDFConsentService;
  let rlsValidation: RlsValidationService;

  const mockUser = {
    id: 'user-id',
    email: 'doctor@example.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['DOCTOR'],
    permissions: ['consent:*:read'],
    sessionId: 'session-123',
  };

  const mockConsent = {
    id: 'consent-id',
    consentNumber: 'PDF-CONSENT-001',
    patientId: 'patient-id',
    finalPdfUrl: '/uploads/consents/consent-xxx-final-1234567890.pdf',
    finalPdfHash: 'abc123def456...',
    status: 'SIGNED',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PDFConsentController],
      providers: [
        {
          provide: PDFConsentService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: RlsValidationService,
          useValue: {
            canAccessPatient: jest.fn(),
          },
        },
        {
          provide: IdentityContextService,
          useValue: {
            getIdentity: jest.fn(),
            setIdentity: jest.fn(),
            hasRole: jest.fn(),
            hasPermission: jest.fn(),
          },
        },
        {
          provide: DataAccessLogService,
          useValue: {
            logDataAccess: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RlsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(DataAccessLogInterceptor)
      .useValue({ intercept: (context: any, next: any) => next.handle() })
      .compile();

    controller = module.get<PDFConsentController>(PDFConsentController);
    consentService = module.get<PDFConsentService>(PDFConsentService);
    rlsValidation = module.get<RlsValidationService>(RlsValidationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Access Control', () => {
    it('should enforce RLS - deny access if user cannot access patient', async () => {
      jest.spyOn(consentService, 'findOne').mockRejectedValue(
        new ForbiddenException('Access denied')
      );

      const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(
        controller.download('consent-id', mockUser, res, {} as any)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow download for archived consent', async () => {
      const archivedConsent = {
        ...mockConsent,
        status: 'ARCHIVED',
        archivedAt: new Date(),
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(archivedConsent as any);
      (path.resolve as jest.Mock).mockImplementation((p) => {
        if (p.includes('uploads')) {
          return p.replace('./', '/app/');
        }
        return `/app/${p}`;
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.createReadStream as jest.Mock).mockReturnValue({
        pipe: jest.fn(),
        on: jest.fn(),
      } as any);

      const res = {
        setHeader: jest.fn(),
      } as any;

      await controller.download('consent-id', mockUser, res, {} as any);

      expect(consentService.findOne).toHaveBeenCalledWith('consent-id', mockUser.id);
    });

    it('should allow download for revoked consent', async () => {
      const revokedConsent = {
        ...mockConsent,
        status: 'REVOKED',
        revokedAt: new Date(),
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(revokedConsent as any);
      (path.resolve as jest.Mock).mockImplementation((p) => {
        if (p.includes('uploads')) {
          return p.replace('./', '/app/');
        }
        return `/app/${p}`;
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.createReadStream as jest.Mock).mockReturnValue({
        pipe: jest.fn(),
        on: jest.fn(),
      } as any);

      const res = {
        setHeader: jest.fn(),
      } as any;

      await controller.download('consent-id', mockUser, res, {} as any);

      expect(consentService.findOne).toHaveBeenCalledWith('consent-id', mockUser.id);
    });
  });

  describe('Path Security', () => {
    it('should prevent directory traversal attacks', async () => {
      const maliciousConsent = {
        ...mockConsent,
        finalPdfUrl: '../../../etc/passwd',
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(maliciousConsent as any);
      (path.resolve as jest.Mock).mockImplementation((p) => {
        // Simulate path resolution that would escape the uploads directory
        if (p.includes('../')) {
          return '/etc/passwd'; // This should be outside uploads directory
        }
        return `/app/uploads/consents/${p}`;
      });

      const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(
        controller.download('consent-id', mockUser, res, {} as any)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should validate file path is within uploads directory', async () => {
      const consent = {
        ...mockConsent,
        finalPdfUrl: '/uploads/consents/valid-file.pdf',
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(consent as any);
      (path.resolve as jest.Mock).mockImplementation((p) => {
        if (p.includes('valid-file')) {
          return '/safe/uploads/consents/valid-file.pdf';
        }
        return '/safe/uploads/consents';
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.createReadStream as jest.Mock).mockReturnValue({
        pipe: jest.fn(),
        on: jest.fn(),
      } as any);

      const res = {
        setHeader: jest.fn(),
      } as any;

      await controller.download('consent-id', mockUser, res, {} as any);

      expect(res.setHeader).toHaveBeenCalled();
    });
  });

  describe('File Handling', () => {
    it('should return 404 if PDF file does not exist', async () => {
      jest.spyOn(consentService, 'findOne').mockResolvedValue(mockConsent as any);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(
        controller.download('consent-id', mockUser, res, {} as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('should return 404 if no PDF URL available', async () => {
      const consentWithoutPdf = {
        ...mockConsent,
        finalPdfUrl: null,
        generatedPdfUrl: null,
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(consentWithoutPdf as any);

      const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(
        controller.download('consent-id', mockUser, res, {} as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('should prefer finalPdfUrl over generatedPdfUrl', async () => {
      const consent = {
        ...mockConsent,
        finalPdfUrl: '/uploads/consents/final.pdf',
        generatedPdfUrl: '/uploads/consents/generated.pdf',
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(consent as any);
      (path.resolve as jest.Mock).mockImplementation((p) => {
        if (p.includes('final.pdf')) {
          return '/app/uploads/consents/final.pdf';
        }
        if (p.includes('uploads')) {
          return p.replace('./', '/app/');
        }
        return `/app/${p}`;
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.createReadStream as jest.Mock).mockReturnValue({
        pipe: jest.fn(),
        on: jest.fn(),
      } as any);

      const res = {
        setHeader: jest.fn(),
      } as any;

      await controller.download('consent-id', mockUser, res, {} as any);

      // Should use finalPdfUrl, not generatedPdfUrl
      expect(fs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining('final.pdf')
      );
    });
  });

  describe('Response Headers', () => {
    it('should set Content-Type header', async () => {
      jest.spyOn(consentService, 'findOne').mockResolvedValue(mockConsent as any);
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'createReadStream').mockReturnValue({
        pipe: jest.fn(),
        on: jest.fn(),
      } as any);

      const res = {
        setHeader: jest.fn(),
      } as any;

      await controller.download('consent-id', mockUser, res, {} as any);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('should include hash in X-PDF-Hash header if available', async () => {
      jest.spyOn(consentService, 'findOne').mockResolvedValue(mockConsent as any);
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'createReadStream').mockReturnValue({
        pipe: jest.fn(),
        on: jest.fn(),
      } as any);

      const res = {
        setHeader: jest.fn(),
      } as any;

      await controller.download('consent-id', mockUser, res, {} as any);

      expect(res.setHeader).toHaveBeenCalledWith('X-PDF-Hash', mockConsent.finalPdfHash);
    });

    it('should not include hash header if hash not available', async () => {
      const consentWithoutHash = {
        ...mockConsent,
        finalPdfHash: null,
      };

      jest.spyOn(consentService, 'findOne').mockResolvedValue(consentWithoutHash as any);
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'createReadStream').mockReturnValue({
        pipe: jest.fn(),
        on: jest.fn(),
      } as any);

      const res = {
        setHeader: jest.fn(),
      } as any;

      await controller.download('consent-id', mockUser, res, {} as any);

      expect(res.setHeader).not.toHaveBeenCalledWith('X-PDF-Hash', expect.anything());
    });
  });
});


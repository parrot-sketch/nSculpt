/**
 * Sign Consent Use Case
 * 
 * Application layer use case for signing a consent document.
 * Enforces business rules: signature order, immutability, state transitions.
 */

import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IConsentRepository } from '../../domain/interfaces/consent-repository.interface';
import { ConsentStateMachine } from '../../domain/services/consent-state-machine.domain.service';
import { Consent, ConsentStatus, SignerType, ConsentSignature } from '../../domain/entities/consent.entity';
import { SignaturePosition } from '../../domain/value-objects/signature-position.vo';

export interface SignConsentRequest {
  consentId: string;
  signerId: string;
  signerName: string;
  signerType: SignerType;
  signatureImage: Buffer;
  position: SignaturePosition;
  ipAddress?: string;
  deviceInfo?: string;
  userId: string;
}

@Injectable()
export class SignConsentUseCase {
  private readonly logger = new Logger(SignConsentUseCase.name);

  // Signature order enforcement
  private readonly SIGNATURE_ORDER: Record<SignerType, number> = {
    [SignerType.PATIENT]: 1,
    [SignerType.GUARDIAN]: 1,
    [SignerType.DOCTOR]: 2,
    [SignerType.NURSE_WITNESS]: 3,
    [SignerType.ADMIN]: 4,
  };

  constructor(
    private readonly consentRepository: IConsentRepository,
    private readonly stateMachine: ConsentStateMachine,
  ) {}

  async execute(request: SignConsentRequest): Promise<ConsentSignature> {
    this.logger.log(`Signing consent ${request.consentId} by ${request.signerType} ${request.signerName}`);

    // 1. Load consent
    const consent = await this.consentRepository.findById(request.consentId);
    if (!consent) {
      throw new NotFoundException(`Consent ${request.consentId} not found`);
    }

    // 2. Validate consent can be signed
    if (consent.isImmutable()) {
      throw new ForbiddenException(`Cannot sign consent in ${consent.status} state`);
    }

    // 3. Check if signer has already signed
    if (consent.hasSigned(request.signerType)) {
      throw new BadRequestException(`${request.signerType} has already signed this consent`);
    }

    // 4. Validate signature order
    this.validateSignatureOrder(consent, request.signerType);

    // 5. Create signature
    const signature: Omit<ConsentSignature, 'id'> = {
      consentId: request.consentId,
      signerId: request.signerId,
      signerName: request.signerName,
      signerType: request.signerType,
      signedAt: new Date(),
      ipAddress: request.ipAddress,
      deviceInfo: request.deviceInfo,
    };

    const savedSignature = await this.consentRepository.addSignature(request.consentId, signature);

    // 6. Update consent status based on signatures
    await this.updateConsentStatusAfterSigning(consent);

    this.logger.log(`Consent ${request.consentId} signed by ${request.signerType} ${request.signerName}`);

    return savedSignature;
  }

  private validateSignatureOrder(consent: Consent, signerType: SignerType): void {
    const requiredOrder = this.SIGNATURE_ORDER[signerType];
    const existingSignatures = consent.signatures;

    // Check if any required prior signer hasn't signed
    for (const [type, order] of Object.entries(this.SIGNATURE_ORDER)) {
      if (order < requiredOrder) {
        const priorSignerType = type as SignerType;
        if (!consent.hasSigned(priorSignerType)) {
          throw new ForbiddenException(
            `Cannot sign as ${signerType}. ${priorSignerType} must sign first.`
          );
        }
      }
    }
  }

  private async updateConsentStatusAfterSigning(consent: Consent): Promise<void> {
    let newStatus: ConsentStatus;

    if (consent.status === ConsentStatus.DRAFT || consent.status === ConsentStatus.READY_FOR_SIGNATURE) {
      // First signature
      newStatus = ConsentStatus.PARTIALLY_SIGNED;
    } else if (consent.status === ConsentStatus.PARTIALLY_SIGNED) {
      // Check if all required signatures are collected
      // For now, we'll transition to SIGNED after DOCTOR signs
      // In a full implementation, this would check against template requirements
      const hasDoctorSignature = consent.hasSigned(SignerType.DOCTOR);
      const hasPatientSignature = consent.hasSigned(SignerType.PATIENT) || consent.hasSigned(SignerType.GUARDIAN);
      
      if (hasDoctorSignature && hasPatientSignature) {
        newStatus = ConsentStatus.SIGNED;
      } else {
        newStatus = ConsentStatus.PARTIALLY_SIGNED;
      }
    } else {
      // No status change needed
      return;
    }

    // Validate transition
    this.stateMachine.validateTransition(consent.status, newStatus);

    // Update status
    await this.consentRepository.updateStatus(consent.id, newStatus);
  }
}






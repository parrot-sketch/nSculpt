import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { MfaService } from '../services/mfa.service';
import { EnableMfaDto } from '../dto/enable-mfa.dto';
import { VerifyMfaDto } from '../dto/verify-mfa.dto';
import { DisableMfaDto } from '../dto/disable-mfa.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/currentUser.decorator';
import { AllowMfaSetupToken } from '../decorators/allow-mfa-setup-token.decorator';
import { AllowMfaChallenge } from '../decorators/allow-mfa-challenge.decorator';
import { UserIdentity } from '../services/identityContext.service';

import { AuthService } from '../services/auth.service';

/**
 * MFA Controller
 * 
 * Endpoints for Multi-Factor Authentication management.
 * 
 * Workflow:
 * 1. POST /auth/mfa/enable - Generate TOTP secret and QR code
 * 2. POST /auth/mfa/verify - Verify TOTP code and enable MFA
 * 3. POST /auth/mfa/disable - Disable MFA (requires verification)
 */
@Controller('auth/mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly authService: AuthService,
  ) { }

  /**
   * Enable MFA (Step 1: Setup)
   * POST /api/v1/auth/mfa/enable
   * 
   * Generates TOTP secret and QR code for user to scan with authenticator app.
   * Returns backup codes for account recovery.
   * 
   * Note: MFA is not fully enabled until user verifies TOTP code via /verify endpoint.
   * 
   * Can be called with:
   * - Regular access token (for existing users enabling MFA)
   * - MFA setup token (for new users required to set up MFA during login)
   */
  @Post('enable')
  @AllowMfaSetupToken()
  @HttpCode(HttpStatus.OK)
  async enableMfa(@CurrentUser() user: UserIdentity, @Req() req: Request, @Body() dto: EnableMfaDto) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.mfaService.enableMfa(user.id, ipAddress, userAgent);

    return {
      message: 'MFA setup initiated. Please scan the QR code with your authenticator app and verify the code.',
      secret: result.secret, // For manual entry if QR code fails
      qrCodeDataUrl: result.qrCodeDataUrl, // QR code image data URL
      backupCodes: result.backupCodes, // Backup codes for account recovery
    };
  }

  /**
   * Verify MFA Setup (Step 2: Verification)
   * POST /api/v1/auth/mfa/verify
   * 
   * Verifies TOTP code and fully enables MFA.
   * Must be called after /enable to complete setup.
   * 
   * Can be called with:
   * - MFA setup token (for new users required to set up MFA during login)
   * - MFA challenge token (for existing users with MFA enabled, verifying their code)
   * - Regular access token (for existing users enabling MFA)
   * 
   * Returns: Full auth tokens if verification successful, allowing user to be fully logged in
   */
  @Post('verify')
  @AllowMfaSetupToken()
  @AllowMfaChallenge()
  @HttpCode(HttpStatus.OK)
  async verifyMfaSetup(
    @CurrentUser() user: UserIdentity,
    @Req() req: Request,
    @Body() verifyDto: VerifyMfaDto,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      // Try to complete setup (first time MFA)
      // This will throw if MFA is already enabled
      const authResult = await this.mfaService.verifyMfaSetupAndCompleteLogin(
        user.id,
        verifyDto.code,
        ipAddress,
        userAgent
      );
      return authResult;
    } catch (error) {
      // If MFA is already enabled, this might be a login challenge verification
      // instead of a setup completion.
      if (error instanceof BadRequestException && error.message === 'MFA is already enabled') {
        // Extract raw token from header
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
          throw new UnauthorizedException('No token provided');
        }

        // Verify as login challenge
        return this.authService.verifyMfaLogin(
          token,
          verifyDto.code,
          ipAddress,
          userAgent
        );
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Disable MFA
   * POST /api/v1/auth/mfa/disable
   * 
   * Disables MFA for user.
   * Requires TOTP code or backup code for verification.
   */
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disableMfa(
    @CurrentUser() user: UserIdentity,
    @Req() req: Request,
    @Body() disableDto: DisableMfaDto,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    await this.mfaService.disableMfa(user.id, disableDto.code, ipAddress, userAgent);

    return {
      message: 'MFA disabled successfully. Your account is no longer protected by two-factor authentication.',
    };
  }
}

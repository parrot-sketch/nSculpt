import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to allow endpoints to accept MFA challenge tokens
 * 
 * MFA challenge tokens are temporary tokens issued after password validation
 * when a user has MFA enabled. They allow the user to:
 * - Call MFA verification endpoints
 * - Logout (to cancel the authentication attempt)
 * 
 * Usage:
 * @AllowMfaChallenge()
 * @Post('mfa/verify')
 * async verifyMfa(@Body() dto: VerifyMfaDto) { ... }
 */
export const ALLOW_MFA_CHALLENGE_KEY = 'allowMfaChallenge';

export const AllowMfaChallenge = () => SetMetadata(ALLOW_MFA_CHALLENGE_KEY, true);

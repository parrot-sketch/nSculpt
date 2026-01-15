import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark endpoints that accept the temporary MFA setup token
 * 
 * Usage:
 * @Post('setup')
 * @AllowMfaSetupToken()
 * async setupMfa(@CurrentUser() user: UserIdentity) {
 *   // This endpoint will accept both regular access tokens and mfa_setup tokens
 * }
 * 
 * When applied:
 * - JwtAuthGuard will allow tokens with type 'mfa_setup' in addition to regular access tokens
 * - This allows unauthenticated users to proceed through MFA setup flow
 */
export const ALLOW_MFA_SETUP_TOKEN_KEY = 'allowMfaSetupToken';

export const AllowMfaSetupToken = () => SetMetadata(ALLOW_MFA_SETUP_TOKEN_KEY, true);

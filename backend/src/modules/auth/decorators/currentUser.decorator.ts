import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserIdentity } from '../services/identityContext.service';

/**
 * CurrentUser Decorator
 * Extracts current user identity from request context
 * 
 * Usage:
 * @Get('profile')
 * getProfile(@CurrentUser() user: UserIdentity) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserIdentity | undefined, ctx: ExecutionContext): UserIdentity | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = (request as any).user as UserIdentity;

    if (!user) {
      throw new Error('User not found in request. Ensure JwtAuthGuard is applied.');
    }

    return data ? user[data] : user;
  },
);













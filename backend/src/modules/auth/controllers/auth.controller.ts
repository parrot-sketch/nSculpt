import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Get, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refreshToken.dto';
import { LogoutDto } from '../dto/logout.dto';
import { Public } from '../decorators/public.decorator';
import { AllowMfaChallenge } from '../decorators/allow-mfa-challenge.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/currentUser.decorator';
import { UserIdentity } from '../services/identityContext.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint
   * POST /api/v1/auth/login
   * Sets secure HTTP-only cookies for tokens
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const authResult = await this.authService.login(loginDto, ipAddress, userAgent);

    // Check if MFA setup is required (no full auth tokens available)
    if ('mfaSetupRequired' in authResult) {
      // Return MFA setup challenge - no cookies set
      return {
        mfaSetupRequired: (authResult as any).mfaSetupRequired,
        tempToken: (authResult as any).tempToken,
        message: (authResult as any).message,
      };
    }

    // Check if MFA challenge is required (user has MFA enabled)
    if ('mfaRequired' in authResult) {
      // Return MFA challenge - no cookies set
      return {
        mfaRequired: (authResult as any).mfaRequired,
        tempToken: (authResult as any).tempToken,
        message: (authResult as any).message,
      };
    }

    // Full auth result - set secure cookies
    const fullAuthResult = authResult as any;

    // Set secure HTTP-only cookies for tokens
    // Access token: short-lived, httpOnly, secure, sameSite
    res.cookie('access_token', fullAuthResult.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: fullAuthResult.expiresIn * 1000, // milliseconds
      path: '/',
    });

    // Refresh token: long-lived, httpOnly, secure, sameSite
    res.cookie('refresh_token', fullAuthResult.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/',
    });

    // Return user data and token expiry (for client-side state)
    // Tokens are sent via secure cookies, not in response body
    return {
      user: fullAuthResult.user,
      sessionId: fullAuthResult.sessionId,
      expiresIn: fullAuthResult.expiresIn,
    };
  }

  /**
   * Refresh token endpoint
   * POST /api/v1/auth/refresh
   * Reads refresh token from secure cookie and sets new access token cookie
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Get refresh token from secure cookie
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const authResult = await this.authService.refreshToken(
      { refreshToken },
      ipAddress,
      userAgent
    );

    // Update secure HTTP-only cookies
    res.cookie('access_token', authResult.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: authResult.expiresIn * 1000, // milliseconds
      path: '/',
    });

    res.cookie('refresh_token', authResult.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/',
    });

    // Return user data (tokens in secure cookies)
    return {
      user: authResult.user,
      sessionId: authResult.sessionId,
      expiresIn: authResult.expiresIn,
    };
  }

  /**
   * Logout endpoint
   * POST /api/v1/auth/logout
   * Clears secure authentication cookies
   * Accepts both access tokens and MFA challenge tokens
   */
  @AllowMfaChallenge()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: UserIdentity,
    @Body() logoutDto: LogoutDto,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.authService.logout(user.sessionId, user.id, logoutDto.reason);

    // Clear secure HTTP-only cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return;
  }

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: UserIdentity) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      permissions: user.permissions,
      departmentId: user.departmentId,
      employeeId: user.employeeId,
    };
  }
}













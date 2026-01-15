import { Module, Global } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector, ModuleRef } from '@nestjs/core';
import type { StringValue } from 'ms';
import { AuthController } from './controllers/auth.controller';
import { MfaController } from './controllers/mfa.controller';
import { AuthService } from './services/auth.service';
import { MfaService } from './services/mfa.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionService } from './services/session.service';
import { IdentityContextService } from './services/identityContext.service';
import { PermissionService } from './services/permission.service';
import { AuthRepository } from './repositories/auth.repository';
import { SessionRepository } from './repositories/session.repository';
import { AuditModule } from '../audit/audit.module';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { PasswordValidationService } from './services/password-validation.service';
import { PasswordHistoryService } from './services/password-history.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = (configService.get<string>('JWT_EXPIRES_IN') || '15m') as StringValue;
        return {
          secret: configService.get<string>('JWT_SECRET') || 'change-me-in-production',
          signOptions: {
            expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
    AuditModule,
  ],
  controllers: [AuthController, MfaController],
  providers: [
    Reflector, // Explicitly provide Reflector for APP_GUARD
    DomainEventService,
    CorrelationService,
    AuthService,
    MfaService,
    SessionService,
    IdentityContextService,
    PermissionService,
    AuthRepository,
    SessionRepository,
    PasswordValidationService,
    PasswordHistoryService,
    {
      provide: APP_GUARD,
      useFactory: (
        moduleRef: ModuleRef,
        reflector: Reflector,
        jwtService: JwtService,
        configService: ConfigService,
        authService: AuthService,
        authRepository: AuthRepository,
      ) => {
        return new JwtAuthGuard(
          moduleRef,
          reflector,
          jwtService,
          configService,
          authService,
          authRepository,
        );
      },
      inject: [ModuleRef, Reflector, JwtService, ConfigService, AuthService, AuthRepository],
    },
  ],
  exports: [
    AuthService,
    MfaService,
    SessionService,
    IdentityContextService,
    PermissionService,
    AuthRepository, // Export for lifecycle role validation
    JwtModule,
    AuditModule,
  ],
})
export class AuthModule { }

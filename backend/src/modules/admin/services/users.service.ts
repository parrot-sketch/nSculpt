import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { SessionService } from '../../auth/services/session.service';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { Domain } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * Users Service
 * 
 * Business logic for user management.
 * Handles validation, domain events, and audit logging.
 */
@Injectable()
export class UsersService {
  private prisma: PrismaClient;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
    private readonly sessionService: SessionService,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new user
   */
  async createUser(createUserDto: CreateUserDto, adminId: string) {
    // Check if email already exists
    const existingUser = await this.usersRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException(`User with email ${createUserDto.email} already exists`);
    }

    // Generate employeeId if not provided
    if (!createUserDto.employeeId) {
      const year = new Date().getFullYear();
      let isUnique = false;
      let generatedId = '';

      while (!isUnique) {
        const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        generatedId = `EMP-${year}-${randomNum}`;
        const existing = await this.prisma.user.findUnique({
          where: { employeeId: generatedId },
        });
        if (!existing) {
          isUnique = true;
        }
      }
      createUserDto.employeeId = generatedId; // Modifying DTO is safe here as it's a local variable reference in JS
    }

    // Check if employeeId already exists (if provided manually)
    if (createUserDto.employeeId) {
      const existingEmployee = await this.prisma.user.findUnique({
        where: { employeeId: createUserDto.employeeId },
      });
      if (existingEmployee) {
        throw new ConflictException(`User with employee ID ${createUserDto.employeeId} already exists`);
      }
    }

    // Generate secure temporary password
    const temporaryPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // Create user with password hash
    const user = await this.usersRepository.create(createUserDto, passwordHash, adminId);

    // Assign role if provided
    if (createUserDto.roleId) {
      await this.assignRole(user.id, { roleId: createUserDto.roleId }, adminId);
    }

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.Created',
      domain: Domain.RBAC,
      aggregateId: user.id,
      aggregateType: 'User',
      payload: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId: user.employeeId,
        roleId: createUserDto.roleId, // Include initial role in event
        createdBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'User',
      resourceId: user.id,
      action: 'CREATE',
      sessionId: context.sessionId,
      reason: `Admin created user: ${user.email}`,
      accessedPHI: false,
      success: true,
    });

    // Return user with temporary password
    const sanitizedUser = this.sanitizeUser(user);
    return { ...sanitizedUser, temporaryPassword };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string, adminId: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'User',
      resourceId: id,
      action: 'READ',
      reason: 'Admin viewed user details',
      accessedPHI: false,
      success: true,
    });

    return this.sanitizeUser(user);
  }

  /**
   * List users with filters
   */
  async listUsers(query: UserQueryDto, adminId: string) {
    const result = await this.usersRepository.findAll(query);

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'User',
      resourceId: 'all',
      action: 'LIST',
      reason: `Admin listed users: ${JSON.stringify(query)}`,
      accessedPHI: false,
      success: true,
    });

    return {
      ...result,
      users: result.users.map(user => this.sanitizeUser(user)),
    };
  }

  /**
   * Update user
   */
  async updateUser(id: string, updateUserDto: UpdateUserDto, adminId: string) {
    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check email uniqueness if email is being updated
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.usersRepository.findByEmail(updateUserDto.email);
      if (emailExists) {
        throw new ConflictException(`User with email ${updateUserDto.email} already exists`);
      }
    }

    // Check employeeId uniqueness if employeeId is being updated
    if (updateUserDto.employeeId && updateUserDto.employeeId !== existingUser.employeeId) {
      const employeeExists = await this.prisma.user.findUnique({
        where: { employeeId: updateUserDto.employeeId },
      });
      if (employeeExists) {
        throw new ConflictException(`User with employee ID ${updateUserDto.employeeId} already exists`);
      }
    }

    // Separate roleId from user data
    const { roleId, ...userData } = updateUserDto;

    // Update user
    const updatedUser = await this.usersRepository.update(id, userData, adminId);

    // Update role if provided
    if (roleId) {
      // Check if user already has this role active
      const userWithRoles = await this.usersRepository.findById(id);
      const activeRole = userWithRoles?.roleAssignments?.find(ra => ra.isActive);

      if (activeRole?.roleId !== roleId) {
        // If has different active role, deactivate it
        if (activeRole) {
          await this.revokeRole(id, activeRole.roleId, adminId);
        }
        // Assign new role
        await this.assignRole(id, { roleId }, adminId);
      }
    }

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.Updated',
      domain: Domain.RBAC,
      aggregateId: id,
      aggregateType: 'User',
      payload: {
        changes: updateUserDto,
        previousValues: {
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          isActive: existingUser.isActive,
        },
        updatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'User',
      resourceId: id,
      action: 'UPDATE',
      sessionId: context.sessionId,
      reason: `Admin updated user: ${id}`,
      accessedPHI: false,
      success: true,
    });

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(id: string, adminId: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (!user.isActive) {
      throw new BadRequestException(`User ${id} is already inactive`);
    }

    // Prevent self-deactivation
    if (id === adminId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    // Deactivate user
    await this.usersRepository.deactivate(id, adminId);

    // Revoke all active sessions
    await this.sessionService.revokeAllUserSessions(id);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.Deactivated',
      domain: Domain.RBAC,
      aggregateId: id,
      aggregateType: 'User',
      payload: {
        deactivatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'User',
      resourceId: id,
      action: 'DEACTIVATE',
      sessionId: context.sessionId,
      reason: `Admin deactivated user: ${id}`,
      accessedPHI: false,
      success: true,
    });
  }

  /**
   * Activate user (reactivate deactivated user)
   */
  async activateUser(id: string, adminId: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.isActive) {
      throw new BadRequestException(`User ${id} is already active`);
    }

    // Activate user
    await this.usersRepository.activate(id, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.Activated',
      domain: Domain.RBAC,
      aggregateId: id,
      aggregateType: 'User',
      payload: {
        activatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'User',
      resourceId: id,
      action: 'ACTIVATE',
      sessionId: context.sessionId,
      reason: `Admin activated user: ${id}`,
      accessedPHI: false,
      success: true,
    });
  }

  /**
   * Permanently delete user account (hard delete)
   * WARNING: This is irreversible and should only be used for test accounts or GDPR compliance
   */
  async deleteUser(id: string, adminId: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Prevent self-deletion
    if (id === adminId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    // Check if user has any critical data (patients, medical records, etc.)
    // This is a safety check - in production, you might want to prevent deletion if user has created critical data
    const prisma = getPrismaClient();
    const patientCount = await prisma.patient.count({
      where: { createdBy: id },
    });

    if (patientCount > 0) {
      throw new BadRequestException(
        `Cannot delete user: User has created ${patientCount} patient record(s). Please transfer ownership or deactivate instead.`
      );
    }

    // Revoke all active sessions first
    await this.sessionService.revokeAllUserSessions(id);

    // Delete user role assignments
    await prisma.userRoleAssignment.deleteMany({
      where: { userId: id },
    });

    // Delete user (cascade will handle related records if configured)
    await prisma.user.delete({
      where: { id },
    });

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.Deleted',
      domain: Domain.RBAC,
      aggregateId: id,
      aggregateType: 'User',
      payload: {
        deletedBy: adminId,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'User',
      resourceId: id,
      action: 'DELETE',
      sessionId: context.sessionId,
      reason: `Admin permanently deleted user: ${id} (${user.email})`,
      accessedPHI: false,
      success: true,
    });
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, assignRoleDto: AssignRoleDto, adminId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id: assignRoleDto.roleId },
    });
    if (!role || !role.isActive) {
      throw new NotFoundException(`Role with ID ${assignRoleDto.roleId} not found or inactive`);
    }

    // Check if assignment already exists
    const existingAssignment = await this.prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        roleId: assignRoleDto.roleId,
        isActive: true,
      },
    });

    if (existingAssignment) {
      throw new ConflictException(`User already has role ${role.code}`);
    }

    // Create role assignment
    const assignment = await this.prisma.userRoleAssignment.create({
      data: {
        userId,
        roleId: assignRoleDto.roleId,
        validFrom: assignRoleDto.validFrom ? new Date(assignRoleDto.validFrom) : new Date(),
        validUntil: assignRoleDto.validUntil ? new Date(assignRoleDto.validUntil) : null,
        createdBy: adminId,
      },
      include: {
        role: true,
      },
    });

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.RoleAssigned',
      domain: Domain.RBAC,
      aggregateId: userId,
      aggregateType: 'User',
      payload: {
        roleId: assignRoleDto.roleId,
        roleCode: role.code,
        validFrom: assignment.validFrom,
        validUntil: assignment.validUntil,
        assignedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'UserRoleAssignment',
      resourceId: assignment.id,
      action: 'CREATE',
      sessionId: context.sessionId,
      reason: `Admin assigned role ${role.code} to user ${userId}`,
      accessedPHI: false,
      success: true,
    });

    return assignment;
  }

  /**
   * Revoke role from user
   */
  async revokeRole(userId: string, roleId: string, adminId: string) {
    const assignment = await this.prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        roleId,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Active role assignment not found for user ${userId} and role ${roleId}`);
    }

    // Revoke assignment
    await this.prisma.userRoleAssignment.update({
      where: { id: assignment.id },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: adminId,
      },
    });

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.RoleRevoked',
      domain: Domain.RBAC,
      aggregateId: userId,
      aggregateType: 'User',
      payload: {
        roleId,
        roleCode: assignment.role.code,
        revokedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'UserRoleAssignment',
      resourceId: assignment.id,
      action: 'REVOKE',
      sessionId: context.sessionId,
      reason: `Admin revoked role ${assignment.role.code} from user ${userId}`,
      accessedPHI: false,
      success: true,
    });
  }

  /**
   * Reset user password
   * Generates a secure temporary password
   */
  async resetPassword(userId: string, adminId: string): Promise<{ temporaryPassword: string }> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Generate secure temporary password (16 characters, alphanumeric + special)
    const temporaryPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // Update password
    await this.usersRepository.updatePasswordHash(userId, passwordHash);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.PasswordReset',
      domain: Domain.RBAC,
      aggregateId: userId,
      aggregateType: 'User',
      payload: {
        resetBy: adminId,
        // DO NOT include password in event payload
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'User',
      resourceId: userId,
      action: 'PASSWORD_RESET',
      sessionId: context.sessionId,
      reason: `Admin reset password for user ${userId}`,
      accessedPHI: false,
      success: true,
    });

    // Revoke all sessions (user must login with new password)
    await this.sessionService.revokeAllUserSessions(userId);

    return { temporaryPassword };
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string, adminId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Session',
      resourceId: userId,
      action: 'LIST',
      reason: `Admin viewed sessions for user ${userId}`,
      accessedPHI: false,
      success: true,
    });

    return sessions;
  }

  /**
   * Sanitize user object (remove sensitive fields)
   */
  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}


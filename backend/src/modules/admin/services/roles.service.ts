import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RolesRepository } from '../repositories/roles.repository';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionDto } from '../dto/assign-permission.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { Domain } from '@prisma/client';

/**
 * Roles Service
 * 
 * Business logic for role management.
 * Handles validation, domain events, and audit logging.
 */
@Injectable()
export class RolesService {
  private prisma: PrismaClient;

  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new role
   */
  async createRole(createRoleDto: CreateRoleDto, adminId: string) {
    const code = createRoleDto.code.toUpperCase();

    // Check if role code already exists
    const existingRole = await this.rolesRepository.findByCode(code);
    if (existingRole) {
      throw new ConflictException(`Role with code ${code} already exists`);
    }

    // Create role
    const role = await this.rolesRepository.create(createRoleDto, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Role.Created',
      domain: Domain.RBAC,
      aggregateId: role.id,
      aggregateType: 'Role',
      payload: {
        code: role.code,
        name: role.name,
        createdBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Role',
      resourceId: role.id,
      action: 'CREATE',
      sessionId: context.sessionId,
      reason: `Admin created role: ${role.code}`,
      accessedPHI: false,
      success: true,
    });

    return role;
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string, adminId: string) {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Role',
      resourceId: id,
      action: 'READ',
      reason: 'Admin viewed role details',
      accessedPHI: false,
      success: true,
    });

    return role;
  }

  /**
   * List all roles
   */
  async listRoles(includeInactive: boolean, adminId: string) {
    const roles = await this.rolesRepository.findAll(includeInactive);

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Role',
      resourceId: 'all',
      action: 'LIST',
      reason: 'Admin listed roles',
      accessedPHI: false,
      success: true,
    });

    return roles;
  }

  /**
   * Update role
   */
  async updateRole(id: string, updateRoleDto: UpdateRoleDto, adminId: string) {
    const existingRole = await this.rolesRepository.findById(id);
    if (!existingRole) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Prevent changing role code
    if (updateRoleDto.code && updateRoleDto.code.toUpperCase() !== existingRole.code) {
      throw new BadRequestException('Role code cannot be changed after creation');
    }

    // Check name uniqueness if name is being updated
    if (updateRoleDto.name && updateRoleDto.name !== existingRole.name) {
      // Name doesn't need to be unique, but we can add validation if needed
    }

    // Update role
    const updatedRole = await this.rolesRepository.update(id, updateRoleDto, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Role.Updated',
      domain: Domain.RBAC,
      aggregateId: id,
      aggregateType: 'Role',
      payload: {
        changes: updateRoleDto,
        previousValues: {
          name: existingRole.name,
          description: existingRole.description,
          isActive: existingRole.isActive,
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
      resourceType: 'Role',
      resourceId: id,
      action: 'UPDATE',
      sessionId: context.sessionId,
      reason: `Admin updated role: ${id}`,
      accessedPHI: false,
      success: true,
    });

    return updatedRole;
  }

  /**
   * Deactivate role
   */
  async deactivateRole(id: string, adminId: string) {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (!role.isActive) {
      throw new BadRequestException(`Role ${id} is already inactive`);
    }

    try {
      // Deactivate role (will throw if has active assignments)
      await this.rolesRepository.deactivate(id, adminId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('active user assignments')) {
        throw new ConflictException(error.message);
      }
      throw error;
    }

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Role.Deactivated',
      domain: Domain.RBAC,
      aggregateId: id,
      aggregateType: 'Role',
      payload: {
        code: role.code,
        deactivatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Role',
      resourceId: id,
      action: 'DEACTIVATE',
      sessionId: context.sessionId,
      reason: `Admin deactivated role: ${role.code}`,
      accessedPHI: false,
      success: true,
    });
  }

  /**
   * Assign permission to role
   */
  async assignPermission(roleId: string, assignPermissionDto: AssignPermissionDto, adminId: string) {
    const role = await this.rolesRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Check if permission exists
    const permission = await this.prisma.permission.findUnique({
      where: { id: assignPermissionDto.permissionId },
    });
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${assignPermissionDto.permissionId} not found`);
    }

    try {
      // Assign permission
      const assignment = await this.rolesRepository.assignPermission(
        roleId,
        assignPermissionDto.permissionId,
        adminId,
      );

      // Emit domain event
      const context = this.correlationService.getContext();
      await this.domainEventService.createEvent({
        eventType: 'Role.PermissionAssigned',
        domain: Domain.RBAC,
        aggregateId: roleId,
        aggregateType: 'Role',
        payload: {
          permissionId: assignPermissionDto.permissionId,
          permissionCode: permission.code,
          assignedBy: adminId,
        },
        createdBy: adminId,
        sessionId: context.sessionId || undefined,
        correlationId: context.correlationId || undefined,
      });

      // Log admin action
      await this.dataAccessLogService.log({
        userId: adminId,
        resourceType: 'RolePermission',
        resourceId: assignment.id,
        action: 'CREATE',
        sessionId: context.sessionId,
        reason: `Admin assigned permission ${permission.code} to role ${role.code}`,
        accessedPHI: false,
        success: true,
      });

      return assignment;
    } catch (error) {
      if (error instanceof Error && error.message.includes('already assigned')) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  /**
   * Remove permission from role
   */
  async removePermission(roleId: string, permissionId: string, adminId: string) {
    const role = await this.rolesRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${permissionId} not found`);
    }

    // Check if assignment exists
    const assignment = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Permission ${permissionId} is not assigned to role ${roleId}`);
    }

    // Remove permission
    await this.rolesRepository.removePermission(roleId, permissionId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Role.PermissionRemoved',
      domain: Domain.RBAC,
      aggregateId: roleId,
      aggregateType: 'Role',
      payload: {
        permissionId,
        permissionCode: permission.code,
        removedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'RolePermission',
      resourceId: assignment.id,
      action: 'DELETE',
      sessionId: context.sessionId,
      reason: `Admin removed permission ${permission.code} from role ${role.code}`,
      accessedPHI: false,
      success: true,
    });
  }

  /**
   * Get users with this role
   */
  async getUsersWithRole(roleId: string, adminId: string) {
    const role = await this.rolesRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const users = await this.rolesRepository.getUsersWithRole(roleId);

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Role',
      resourceId: roleId,
      action: 'LIST_USERS',
      reason: `Admin viewed users with role ${role.code}`,
      accessedPHI: false,
      success: true,
    });

    return users;
  }
}






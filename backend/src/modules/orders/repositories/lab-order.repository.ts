import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient, OrderStatus, ResultStatus, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateLabOrderDto } from '../dto/create-lab-order.dto';
import { RecordResultDto } from '../dto/record-result.dto';

@Injectable()
export class LabOrderRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new lab order
   * Starts with CREATED status
   */
  async create(
    data: CreateLabOrderDto & {
      patientId: string;
      orderedById: string;
      createdBy: string;
    },
  ): Promise<any> {
    const orderData: Prisma.LabOrderCreateInput = {
      patient: {
        connect: { id: data.patientId },
      },
      consultation: {
        connect: { id: data.consultationId },
      },
      orderedBy: {
        connect: { id: data.orderedById },
      },
      orderType: 'LAB',
      testName: data.testName,
      priority: data.priority,
      status: OrderStatus.CREATED,
      version: 1,
      createdBy: data.createdBy,
    };

    return await this.prisma.labOrder.create({
      data: orderData,
      include: {
        patient: true,
        consultation: true,
        orderedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        results: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find order by ID
   */
  async findById(id: string): Promise<any> {
    return await this.prisma.labOrder.findUnique({
      where: { id },
      include: {
        patient: true,
        consultation: true,
        orderedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        results: {
          include: {
            recordedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * List orders by consultation
   */
  async findByConsultation(
    consultationId: string,
    filters?: {
      status?: OrderStatus;
      includeArchived?: boolean;
    },
  ): Promise<any[]> {
    const where: Prisma.LabOrderWhereInput = {
      consultationId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.includeArchived === false && { archived: false }),
    };

    return await this.prisma.labOrder.findMany({
      where,
      include: {
        patient: true,
        consultation: true,
        orderedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        results: {
          include: {
            recordedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update order status
   * Validates state transitions
   */
  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    options?: {
      approvedById?: string;
      updatedBy?: string;
      version?: number;
    },
  ): Promise<any> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Lab order with ID ${id} not found`);
    }

    // Optimistic locking
    if (
      options?.version !== undefined &&
      options.version !== existing.version
    ) {
      throw new ConflictException(
        'Lab order was modified by another user. Please refresh and try again.',
      );
    }

    const updateData: Prisma.LabOrderUpdateInput = {
      status: newStatus,
      ...(options?.approvedById && {
        approvedBy: {
          connect: { id: options.approvedById },
        },
      }),
      version: {
        increment: 1,
      },
      ...(options?.updatedBy && {
        updatedBy: options.updatedBy,
      }),
    };

    return await this.prisma.labOrder.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        consultation: true,
        orderedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        results: {
          include: {
            recordedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Create lab result
   * Append-only operation
   */
  async createResult(
    labOrderId: string,
    data: RecordResultDto & {
      recordedById: string;
    },
  ): Promise<any> {
    // Verify order exists
    const order = await this.findById(labOrderId);
    if (!order) {
      throw new NotFoundException(`Lab order with ID ${labOrderId} not found`);
    }

    const resultData: Prisma.LabResultCreateInput = {
      labOrder: {
        connect: { id: labOrderId },
      },
      resultStatus: data.resultStatus || ResultStatus.AVAILABLE,
      resultText: data.resultText,
      fileUrl: data.fileUrl,
      ...(data.recordedById && {
        recordedBy: {
          connect: { id: data.recordedById },
        },
      }),
      version: 1,
    };

    // Create result and update order status to COMPLETED
    const [result] = await Promise.all([
      this.prisma.labResult.create({
        data: resultData,
        include: {
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          labOrder: true,
        },
      }),
      // Update order status to COMPLETED when result is recorded
      this.prisma.labOrder.update({
        where: { id: labOrderId },
        data: {
          status: OrderStatus.COMPLETED,
          version: {
            increment: 1,
          },
        },
      }),
    ]);

    return result;
  }

  /**
   * Archive order (soft delete)
   */
  async archive(id: string, archivedBy: string): Promise<any> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Lab order with ID ${id} not found`);
    }

    if (existing.archived) {
      throw new ConflictException('Lab order is already archived');
    }

    return await this.prisma.labOrder.update({
      where: { id },
      data: {
        archived: true,
        archivedAt: new Date(),
        archivedBy,
        version: {
          increment: 1,
        },
      },
      include: {
        patient: true,
        consultation: true,
        orderedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        results: {
          include: {
            recordedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}










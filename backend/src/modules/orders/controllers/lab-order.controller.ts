import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LabOrderService } from '../services/lab-order.service';
import { CreateLabOrderDto } from '../dto/create-lab-order.dto';
import { ApproveLabOrderDto } from '../dto/approve-lab-order.dto';
import { RecordResultDto } from '../dto/record-result.dto';
import { CancelLabOrderDto } from '../dto/cancel-lab-order.dto';
import { ListOrdersDto } from '../dto/list-orders.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

@Controller('orders/labs')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class LabOrderController {
  constructor(private readonly labOrderService: LabOrderService) { }

  /**
   * Create a new lab order
   * Only DOCTOR/SURGEON/ADMIN can create orders
   */
  @Post()
  @Roles('ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('orders:*:write')
  create(
    @Body() createLabOrderDto: CreateLabOrderDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.labOrderService.createOrder(createLabOrderDto, user.id);
  }

  /**
   * Get a single order by ID
   * Front Desk cannot access
   */
  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'LAB_TECH')
  @Permissions('orders:*:read')
  findOne(@Param('id') id: string, @CurrentUser() user?: UserIdentity) {
    return this.labOrderService.findOne(id, user?.id);
  }

  /**
   * List orders by consultation
   * Front Desk cannot access
   */
  @Get('by-consultation/:consultationId')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'LAB_TECH')
  @Permissions('orders:*:read')
  listByConsultation(
    @Param('consultationId') consultationId: string,
    @Query() listOrdersDto: ListOrdersDto,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.labOrderService.listOrdersByConsultation(
      consultationId,
      listOrdersDto,
      user?.id,
    );
  }

  /**
   * Approve lab order
   * Transitions from CREATED to APPROVED
   * Only DOCTOR/SURGEON/ADMIN can approve
   */
  @Post(':id/approve')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('orders:*:write')
  approve(
    @Param('id') id: string,
    @Body() approveLabOrderDto: ApproveLabOrderDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.labOrderService.approveOrder(id, approveLabOrderDto, user.id);
  }

  /**
   * Record lab result
   * Transitions order to COMPLETED
   * Auto-creates EMR addendum
   */
  @Post(':id/result')
  @Roles('ADMIN', 'LAB_TECH')
  @Permissions('orders:*:write')
  recordResult(
    @Param('id') id: string,
    @Body() recordResultDto: RecordResultDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.labOrderService.recordResult(id, recordResultDto, user.id);
  }

  /**
   * Cancel lab order
   * Only DOCTOR/SURGEON/ADMIN can cancel
   */
  @Post(':id/cancel')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('orders:*:write')
  cancel(
    @Param('id') id: string,
    @Body() cancelLabOrderDto: CancelLabOrderDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.labOrderService.cancelOrder(id, cancelLabOrderDto, user.id);
  }

  /**
   * Archive order (soft delete)
   * Only ADMIN can archive
   */
  @Post(':id/archive')
  @Roles('ADMIN')
  @Permissions('orders:*:delete')
  archive(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return this.labOrderService.archiveOrder(id, user.id);
  }
}










import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import { BillingService } from '../services/billing.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

@Controller('billing')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class BillingController {
  constructor(private readonly billingService: BillingService) { }

  @Post('bills')
  @Roles('ADMIN', 'BILLING', 'DOCTOR')
  @Permissions('billing:*:write')
  create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.billingService.create(createInvoiceDto, user.id);
  }

  @Get('bills')
  @Roles('ADMIN', 'BILLING', 'DOCTOR')
  @Permissions('billing:*:read')
  findAll(
    @Query('skip', ParseIntPipe) skip?: number,
    @Query('take', ParseIntPipe) take?: number,
    @CurrentUser() user?: UserIdentity,
  ) {
    // Filter by patient relationships OR require BILLING role for all
    return this.billingService.findAll(skip, take, user?.id);
  }

  @Get('bills/:id')
  @Roles('ADMIN', 'BILLING', 'DOCTOR')
  @Permissions('billing:*:read')
  // RlsGuard validates patient relationship OR BILLING role
  findOne(@Param('id') id: string) {
    return this.billingService.findOne(id);
  }

  @Patch('bills/:id')
  @Roles('ADMIN', 'BILLING')
  @Permissions('billing:*:write')
  // RlsGuard validates access
  update(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.billingService.update(id, updateInvoiceDto, user.id);
  }

  @Post('invoices')
  @Roles('FRONT_DESK', 'ADMIN', 'BILLING')
  createInvoice(
    @Body() data: {
      patientId: string;
      visitId?: string;
      procedurePlanId?: string;
      followUpPlanId?: string;
      totalAmount: number;
    },
    @CurrentUser() user: UserIdentity,
  ) {
    return this.billingService.createInvoice(data);
  }

  @Post('payments/record')
  @Roles('FRONT_DESK', 'ADMIN', 'BILLING')
  recordPayment(
    @Body() data: {
      invoiceId: string;
      gatewayName: string;
      transactionId: string;
      amount: number;
      status: string; // Will be cast to PaymentStatus
    },
  ) {
    return this.billingService.recordPayment(data.invoiceId, data as any);
  }
}


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
import { InventoryService } from '../services/inventory.service';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';
import { ReceiveStockDto } from '../dto/receive-stock.dto';
import { ConsumeStockDto } from '../dto/consume-stock.dto';
import { ReverseTransactionDto } from '../dto/reverse-transaction.dto';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { TransferStockDto } from '../dto/transfer-stock.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

@Controller('inventory')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('items')
  @Roles('ADMIN', 'INVENTORY_MANAGER')
  @Permissions('inventory:*:write')
  create(
    @Body() createItemDto: CreateItemDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.inventoryService.create(createItemDto, user.id);
  }

  @Get('items')
  @Roles('ADMIN', 'INVENTORY_MANAGER', 'NURSE', 'DOCTOR')
  @Permissions('inventory:*:read')
  findAll(
    @Query('skip', ParseIntPipe) skip?: number,
    @Query('take', ParseIntPipe) take?: number,
    @CurrentUser() user?: UserIdentity,
  ) {
    // Inventory is less sensitive - all authorized users can view
    // But filter by department if needed
    return this.inventoryService.findAll(skip, take, user?.id);
  }

  @Get('items/:id')
  @Roles('ADMIN', 'INVENTORY_MANAGER', 'NURSE', 'DOCTOR')
  @Permissions('inventory:*:read')
  // RlsGuard validates read access (already checked by RolesGuard for inventory)
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch('items/:id')
  @Roles('ADMIN', 'INVENTORY_MANAGER')
  @Permissions('inventory:*:write')
  // RlsGuard validates modification rights (ADMIN or INVENTORY_MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.inventoryService.update(id, updateItemDto, user.id);
  }

  // ============================================================================
  // Phase 1: Ledger Operations (Append-Only Inventory Management)
  // ============================================================================

  /**
   * Receive stock
   * Creates receipt transaction and batch if needed
   */
  @Post('ledger/receive')
  @Roles('ADMIN', 'INVENTORY_MANAGER')
  @Permissions('inventory:*:write')
  receiveStock(
    @Body() receiveStockDto: ReceiveStockDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.inventoryService.receiveStock(receiveStockDto, user.id);
  }

  /**
   * Consume stock (FIFO)
   * Uses FIFO deduction, creates consumption transaction
   */
  @Post('ledger/consume')
  @Roles('ADMIN', 'INVENTORY_MANAGER', 'NURSE', 'DOCTOR', 'SURGEON')
  @Permissions('inventory:*:write')
  consumeStock(
    @Body() consumeStockDto: ConsumeStockDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.inventoryService.consumeStock(consumeStockDto, user.id);
  }

  /**
   * Reverse a transaction
   * Creates reversal entry (not an edit)
   */
  @Post('ledger/reverse')
  @Roles('ADMIN', 'INVENTORY_MANAGER')
  @Permissions('inventory:*:write')
  reverseTransaction(
    @Body() reverseTransactionDto: ReverseTransactionDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.inventoryService.reverseTransaction(
      reverseTransactionDto,
      user.id,
    );
  }

  /**
   * Adjust stock (ADMIN only)
   * For stock count corrections
   */
  @Post('ledger/adjust')
  @Roles('ADMIN')
  @Permissions('inventory:*:write')
  adjustStock(
    @Body() adjustStockDto: AdjustStockDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.inventoryService.adjustStock(adjustStockDto, user.id);
  }

  /**
   * Transfer stock between locations
   */
  @Post('ledger/transfer')
  @Roles('ADMIN', 'INVENTORY_MANAGER')
  @Permissions('inventory:*:write')
  transferStock(
    @Body() transferStockDto: TransferStockDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.inventoryService.transferStock(transferStockDto, user.id);
  }

  /**
   * Get current stock for an item
   * Calculated from ledger (SUM receipts - SUM outgoing)
   */
  @Get('ledger/stock/:itemId')
  @Roles('ADMIN', 'INVENTORY_MANAGER', 'NURSE', 'DOCTOR')
  @Permissions('inventory:*:read')
  getStock(
    @Param('itemId') itemId: string,
    @Query('batchId') batchId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.inventoryService.getStock(itemId, batchId, locationId);
  }
}


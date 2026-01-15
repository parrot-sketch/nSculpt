'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventory.service';
import { DataTable } from '@/components/tables/DataTable';
import { StatCard } from '@/components/cards/StatCard';
import { PermissionsGuard } from '@/components/layout/PermissionsGuard';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';
import { buildPermission } from '@/lib/permissions';
import { InventoryItem, InventoryStock } from '@/types/domain';
import Link from 'next/link';

/**
 * Inventory Management page - For Inventory Managers and Nurses
 * Track surgical instruments, consumables, and stock levels
 */
export default function InventoryPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['inventory-items', selectedCategory],
    queryFn: () => inventoryService.getItems(0, 50),
  });

  const { data: stockData } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => inventoryService.getStock(),
  });

  // Calculate stats
  const totalItems = itemsData?.total || 0;
  const lowStockCount =
    stockData?.filter((s) => {
      const onHand = parseFloat(s.quantityOnHand);
      const reorderPoint = s.item?.reorderPoint ? parseFloat(s.item.reorderPoint) : 0;
      return onHand <= reorderPoint && reorderPoint > 0;
    }).length || 0;
  const outOfStockCount =
    stockData?.filter((s) => parseFloat(s.quantityOnHand) === 0).length || 0;

  const columns = [
    {
      key: 'itemNumber',
      header: 'Item #',
      render: (item: InventoryItem) => (
        <Link
          href={`/inventory/items/${item.id}`}
          className="text-primary hover:underline font-medium"
        >
          {item.itemNumber}
        </Link>
      ),
    },
    {
      key: 'name',
      header: 'Item Name',
      render: (item: InventoryItem) => (
        <div>
          <p className="font-medium text-neutral-900">{item.name}</p>
          {item.description && (
            <p className="text-xs text-neutral-500 line-clamp-1">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'itemType',
      header: 'Type',
      render: (item: InventoryItem) => (
        <span className="text-sm text-neutral-600">{item.itemType}</span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock Level',
      render: (item: InventoryItem) => {
        const stock = stockData?.find((s) => s.itemId === item.id);
        if (!stock) return <span className="text-neutral-400">N/A</span>;
        const onHand = parseFloat(stock.quantityOnHand);
        const reorderPoint = item.reorderPoint ? parseFloat(item.reorderPoint) : 0;
        const isLow = reorderPoint > 0 && onHand <= reorderPoint;
        const isOut = onHand === 0;
        return (
          <div>
            <span className={isOut ? 'text-red-600 font-medium' : isLow ? 'text-yellow-600' : 'text-neutral-900'}>
              {onHand} {item.unitOfMeasure}
            </span>
            {item.reorderPoint && (
              <p className="text-xs text-neutral-500">
                Reorder: {item.reorderPoint} {item.unitOfMeasure}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'unitCost',
      header: 'Unit Cost',
      render: (item: InventoryItem) =>
        item.unitCost ? `$${parseFloat(item.unitCost).toFixed(2)}` : 'N/A',
    },
    {
      key: 'isBillable',
      header: 'Billable',
      render: (item: InventoryItem) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            item.isBillable
              ? 'bg-green-100 text-green-800'
              : 'bg-neutral-100 text-neutral-600'
          }`}
        >
          {item.isBillable ? 'Yes' : 'No'}
        </span>
      ),
    },
  ];

  return (
    <PermissionsGuard
      requiredPermission={buildPermission(
        PERMISSION_DOMAINS.INVENTORY,
        '*',
        PERMISSION_ACTIONS.READ
      )}
    >
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-neutral-900">Inventory Management</h1>
          <Link
            href="/inventory/items/new"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Add Item
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard title="Total Items" value={totalItems} />
          <StatCard
            title="Low Stock"
            value={lowStockCount}
            onClick={() => {
              // Filter to low stock items
            }}
          />
          <StatCard title="Out of Stock" value={outOfStockCount} />
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 shadow-soft">
          {isLoading ? (
            <div className="p-8 text-center text-neutral-500">Loading inventory...</div>
          ) : (
            <DataTable
              data={itemsData?.data || []}
              columns={columns}
              keyExtractor={(item) => item.id}
              emptyMessage="No inventory items found"
              onRowClick={(item) => {
                window.location.href = `/inventory/items/${item.id}`;
              }}
            />
          )}
        </div>
      </div>
    </PermissionsGuard>
  );
}

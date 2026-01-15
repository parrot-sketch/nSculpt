'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import type { UpdateBillingCodeRequest } from '@/types/admin-system-config';
import { PageHeader } from '@/components/admin/PageHeader';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';

/**
 * Edit Billing Code Page
 * 
 * Edit an existing billing code with a simple, intuitive form.
 */
export default function EditBillingCodePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [formData, setFormData] = useState<UpdateBillingCodeRequest>({
    description: '',
    category: '',
    active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch billing code
  const { data: billingCode, isLoading, error } = useQuery({
    queryKey: ['admin', 'billing-codes', id],
    queryFn: () => adminService.getBillingCodeById(id),
  });

  // Update form when data loads
  useEffect(() => {
    if (billingCode) {
      setFormData({
        description: billingCode.description,
        category: billingCode.category || '',
        active: billingCode.active,
      });
    }
  }, [billingCode]);

  const mutation = useMutation({
    mutationFn: (data: UpdateBillingCodeRequest) => adminService.updateBillingCode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing-codes'] });
      router.push(ROUTES.ADMIN_BILLING_CODES);
    },
    onError: (error: any) => {
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else {
        setErrors({ submit: 'Failed to update billing code. Please try again.' });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Simple validation
    const newErrors: Record<string, string> = {};
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate(formData);
  };

  const handleChange = (field: keyof UpdateBillingCodeRequest) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleCheckboxChange = (field: keyof UpdateBillingCodeRequest) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.checked }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !billingCode) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Billing code not found or failed to load.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Billing Code"
        description="Update billing code information"
        breadcrumbs={[
          { label: 'Admin', href: ROUTES.ADMIN_DASHBOARD },
          { label: 'System Configuration', href: ROUTES.ADMIN_DEPARTMENTS },
          { label: 'Billing Codes', href: ROUTES.ADMIN_BILLING_CODES },
          { label: billingCode.code },
        ]}
      />

      {/* Billing Code Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-mono font-semibold text-neutral-900">{billingCode.code}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {billingCode.codeType}
              </span>
              <StatusBadge status={billingCode.active} />
            </div>
            <p className="text-sm text-neutral-500 mt-1">
              Created {formatDateTime(billingCode.createdAt)} • Last updated {formatDateTime(billingCode.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Code (read-only) */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-neutral-700 mb-2">
              Code
            </label>
            <input
              type="text"
              id="code"
              value={billingCode.code}
              disabled
              className="block w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500 sm:text-sm font-mono cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-neutral-500">
              Billing code cannot be changed
            </p>
          </div>

          {/* Code Type (read-only) */}
          <div>
            <label htmlFor="codeType" className="block text-sm font-medium text-neutral-700 mb-2">
              Code Type
            </label>
            <input
              type="text"
              id="codeType"
              value={billingCode.codeType}
              disabled
              className="block w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500 sm:text-sm cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-neutral-500">
              Code type cannot be changed
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={handleChange('description')}
              rows={4}
              className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                errors.description
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-neutral-300 focus:border-primary focus:ring-primary'
              }`}
              disabled={mutation.isPending}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-2">
              Category
            </label>
            <input
              type="text"
              id="category"
              value={formData.category || ''}
              onChange={handleChange('category')}
              className="block w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary sm:text-sm"
              disabled={mutation.isPending}
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active ?? true}
              onChange={handleCheckboxChange('active')}
              className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded"
              disabled={mutation.isPending}
            />
            <label htmlFor="active" className="ml-2 block text-sm text-neutral-700">
              Billing code is active
            </label>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {mutation.isPending && <LoadingSpinner />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}










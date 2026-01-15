'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import type { CreateBillingCodeRequest } from '@/types/admin-system-config';
import { PageHeader } from '@/components/admin/PageHeader';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ROUTES } from '@/lib/constants';

/**
 * Create Billing Code Page
 * 
 * Simple, intuitive form for creating a new billing code.
 */
export default function CreateBillingCodePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateBillingCodeRequest>({
    code: '',
    codeType: 'CPT',
    description: '',
    category: '',
    active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (data: CreateBillingCodeRequest) => adminService.createBillingCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing-codes'] });
      router.push(ROUTES.ADMIN_BILLING_CODES);
    },
    onError: (error: any) => {
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else {
        setErrors({ submit: 'Failed to create billing code. Please try again.' });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Simple validation
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate(formData);
  };

  const handleChange = (field: keyof CreateBillingCodeRequest) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleCheckboxChange = (field: keyof CreateBillingCodeRequest) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.checked }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Billing Code"
        description="Add a new billing code to the system"
        breadcrumbs={[
          { label: 'Admin', href: ROUTES.ADMIN_DASHBOARD },
          { label: 'System Configuration', href: ROUTES.ADMIN_DEPARTMENTS },
          { label: 'Billing Codes', href: ROUTES.ADMIN_BILLING_CODES },
          { label: 'Create' },
        ]}
      />

      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Code */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-neutral-700 mb-2">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="code"
              value={formData.code}
              onChange={handleChange('code')}
              className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 sm:text-sm font-mono ${
                errors.code
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-neutral-300 focus:border-primary focus:ring-primary'
              }`}
              placeholder="e.g., 99213, E11.9, A4215"
              disabled={mutation.isPending}
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-600">{errors.code}</p>
            )}
            <p className="mt-1 text-sm text-neutral-500">
              Billing code identifier (format depends on code type)
            </p>
          </div>

          {/* Code Type */}
          <div>
            <label htmlFor="codeType" className="block text-sm font-medium text-neutral-700 mb-2">
              Code Type <span className="text-red-500">*</span>
            </label>
            <select
              id="codeType"
              value={formData.codeType}
              onChange={handleChange('codeType')}
              className="block w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary sm:text-sm"
              disabled={mutation.isPending}
            >
              <option value="CPT">CPT (Current Procedural Terminology)</option>
              <option value="ICD10">ICD-10 (International Classification of Diseases)</option>
              <option value="HCPCS">HCPCS (Healthcare Common Procedure Coding System)</option>
            </select>
            <p className="mt-1 text-sm text-neutral-500">
              Select the type of billing code
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={handleChange('description')}
              rows={4}
              className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                errors.description
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-neutral-300 focus:border-primary focus:ring-primary'
              }`}
              placeholder="Detailed description of the billing code"
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
              value={formData.category}
              onChange={handleChange('category')}
              className="block w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary sm:text-sm"
              placeholder="e.g., Office Visit, Lab Test, Procedure"
              disabled={mutation.isPending}
            />
            <p className="mt-1 text-sm text-neutral-500">
              Optional category for grouping codes
            </p>
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
              Create Billing Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}










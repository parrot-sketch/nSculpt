'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import type { UpdateInsuranceProviderRequest } from '@/types/admin-system-config';
import { PageHeader } from '@/components/admin/PageHeader';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';

/**
 * Edit Insurance Provider Page
 * 
 * Edit an existing insurance provider with a simple, intuitive form.
 */
export default function EditInsuranceProviderPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [formData, setFormData] = useState<UpdateInsuranceProviderRequest>({
    name: '',
    payerId: '',
    contactName: '',
    email: '',
    phone: '',
    active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch insurance provider
  const { data: provider, isLoading, error } = useQuery({
    queryKey: ['admin', 'insurance-providers', id],
    queryFn: () => adminService.getInsuranceProviderById(id),
  });

  // Update form when data loads
  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name,
        payerId: provider.payerId || '',
        contactName: provider.contactName || '',
        email: provider.email || '',
        phone: provider.phone || '',
        active: provider.active,
      });
    }
  }, [provider]);

  const mutation = useMutation({
    mutationFn: (data: UpdateInsuranceProviderRequest) => adminService.updateInsuranceProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'insurance-providers'] });
      router.push(ROUTES.ADMIN_INSURANCE_PROVIDERS);
    },
    onError: (error: any) => {
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else {
        setErrors({ submit: 'Failed to update insurance provider. Please try again.' });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Simple validation
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate(formData);
  };

  const handleChange = (field: keyof UpdateInsuranceProviderRequest) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleCheckboxChange = (field: keyof UpdateInsuranceProviderRequest) => (
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

  if (error || !provider) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Insurance provider not found or failed to load.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Insurance Provider"
        description="Update insurance provider information"
        breadcrumbs={[
          { label: 'Admin', href: ROUTES.ADMIN_DASHBOARD },
          { label: 'System Configuration', href: ROUTES.ADMIN_DEPARTMENTS },
          { label: 'Insurance Providers', href: ROUTES.ADMIN_INSURANCE_PROVIDERS },
          { label: provider.code },
        ]}
      />

      {/* Provider Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-mono font-semibold text-neutral-900">{provider.code}</span>
              <StatusBadge status={provider.active} />
            </div>
            <p className="text-sm text-neutral-500 mt-1">
              Created {formatDateTime(provider.createdAt)} • Last updated {formatDateTime(provider.updatedAt)}
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
              value={provider.code}
              disabled
              className="block w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500 sm:text-sm font-mono cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-neutral-500">
              Provider code cannot be changed
            </p>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name || ''}
              onChange={handleChange('name')}
              className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                errors.name
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-neutral-300 focus:border-primary focus:ring-primary'
              }`}
              disabled={mutation.isPending}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Payer ID */}
          <div>
            <label htmlFor="payerId" className="block text-sm font-medium text-neutral-700 mb-2">
              Payer ID
            </label>
            <input
              type="text"
              id="payerId"
              value={formData.payerId || ''}
              onChange={handleChange('payerId')}
              className="block w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary sm:text-sm font-mono"
              disabled={mutation.isPending}
            />
          </div>

          {/* Contact Name */}
          <div>
            <label htmlFor="contactName" className="block text-sm font-medium text-neutral-700 mb-2">
              Contact Name
            </label>
            <input
              type="text"
              id="contactName"
              value={formData.contactName || ''}
              onChange={handleChange('contactName')}
              className="block w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary sm:text-sm"
              disabled={mutation.isPending}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email || ''}
              onChange={handleChange('email')}
              className="block w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary sm:text-sm"
              disabled={mutation.isPending}
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone || ''}
              onChange={handleChange('phone')}
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
              Provider is active
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










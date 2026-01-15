'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FileText, Plus, Upload } from 'lucide-react';
import { consentService } from '@/services/consent.service';
import { Card } from '@/components/layout/Card';
import { PageHeader } from '@/components/admin/PageHeader';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { EmptyState } from '@/components/admin/EmptyState';
import { ErrorState } from '@/components/admin/ErrorState';
import type { ConsentTemplate } from '@/types/consent';

/**
 * Consent Templates List Page (Admin)
 * 
 * Lists all consent templates for management
 */
export default function ConsentTemplatesPage() {
  const { data: templates, isLoading, error } = useQuery<ConsentTemplate[]>({
    queryKey: ['consent', 'templates'],
    queryFn: () => consentService.listTemplates(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Consent Templates"
          description="Manage consent form templates"
        />
        <Card padding="md">
          <LoadingSpinner />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Consent Templates"
          description="Manage consent form templates"
        />
        <Card padding="md">
          <ErrorState
            title="Unable to load templates"
            message={
              error instanceof Error
                ? error.message
                : 'Failed to load consent templates. Please try again.'
            }
            onRetry={() => window.location.reload()}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consent Templates"
        description="Manage consent form templates"
        actions={
          <div className="flex gap-3">
            <Link
              href="/admin/system-config/consent-templates/upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload PDF
            </Link>
            <Link
              href="/admin/system-config/consent-templates/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </Link>
          </div>
        }
      />

      {!templates || templates.length === 0 ? (
        <Card padding="md">
          <EmptyState
            icon={<FileText className="h-12 w-12 text-neutral-400" />}
            title="No templates yet"
            description="Get started by uploading a PDF or creating a new template"
            action={
              <Link
                href="/admin/system-config/consent-templates/upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload PDF
              </Link>
            }
          />
        </Card>
      ) : (
        <Card padding="md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                    Template Code
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                    Version
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr
                    key={template.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50"
                  >
                    <td className="py-3 px-4">
                      <code className="text-sm text-neutral-600">
                        {template.templateCode}
                      </code>
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-900">
                      {template.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm px-2 py-1 bg-neutral-100 text-neutral-700 rounded">
                        {template.templateType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-600">
                      {template.version}
                    </td>
                    <td className="py-3 px-4">
                      {template.isActive ? (
                        <span className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="text-sm px-2 py-1 bg-neutral-100 text-neutral-700 rounded">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/system-config/consent-templates/${template.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/system-config/consent-templates/${template.id}/test-signing`}
                          className="text-sm text-green-600 hover:underline font-medium"
                        >
                          Test Signing
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}


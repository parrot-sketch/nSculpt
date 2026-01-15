'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { FileText, Save } from 'lucide-react';
import { consentService } from '@/services/consent.service';
import { Card } from '@/components/layout/Card';
import { PageHeader } from '@/components/admin/PageHeader';

/**
 * Template Builder (Simplified Version)
 * 
 * For now, this is a basic form. Full builder can be enhanced later.
 * Admin can create template structure manually.
 */
export default function CreateTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filePath = searchParams.get('filePath');
  const fileHash = searchParams.get('fileHash');

  const [formData, setFormData] = useState({
    templateCode: '',
    name: '',
    templateType: 'GENERAL' as 'GENERAL' | 'PROCEDURE_SPECIFIC',
    description: '',
    procedureCode: '',
    originalDocumentPath: filePath || '',
    originalDocumentHash: fileHash || '',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => consentService.createTemplate(data),
    onSuccess: () => {
      router.push('/admin/system-config/consent-templates');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic template structure (can be enhanced later)
    const templateData = {
      ...formData,
      pages: [
        {
          pageNumber: 1,
          title: 'Page 1',
          sectionIds: [],
        },
      ],
      sections: [
        {
          sectionCode: 'AUTHORIZATION',
          title: 'Authorization',
          content: 'I authorize...',
          order: 1,
          clauses: [],
        },
      ],
      requiredParties: [
        { partyType: 'PATIENT', required: true, order: 1 },
        { partyType: 'SURGEON', required: true, order: 2 },
      ],
      fillInFields: [],
    };

    createMutation.mutate(templateData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Consent Template"
        description="Create a new consent template. You can enhance the structure later."
        backLink="/admin/system-config/consent-templates"
      />

      <form onSubmit={handleSubmit}>
        <Card padding="md">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  Template Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.templateCode}
                  onChange={(e) =>
                    setFormData({ ...formData, templateCode: e.target.value })
                  }
                  placeholder="GENERAL_CONSENT_V1"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="General Surgery Consent"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Template Type *
              </label>
              <select
                required
                value={formData.templateType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    templateType: e.target.value as 'GENERAL' | 'PROCEDURE_SPECIFIC',
                  })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="GENERAL">General</option>
                <option value="PROCEDURE_SPECIFIC">Procedure-Specific</option>
              </select>
            </div>

            {formData.templateType === 'PROCEDURE_SPECIFIC' && (
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  CPT Code
                </label>
                <input
                  type="text"
                  value={formData.procedureCode}
                  onChange={(e) =>
                    setFormData({ ...formData, procedureCode: e.target.value })
                  }
                  placeholder="19342"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                placeholder="Template description..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {filePath && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    PDF Reference Attached
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Original document will be preserved
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {createMutation.isPending ? 'Creating...' : 'Create Template'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      </form>

      <Card padding="md" className="bg-yellow-50 border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> This is a simplified template builder. For complex templates
          with multiple sections, pages, and fill-in fields, you may want to use the API
          directly or enhance this UI later.
        </p>
      </Card>
    </div>
  );
}










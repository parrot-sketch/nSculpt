'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { consentService } from '@/services/consent.service';
import { Card } from '@/components/layout/Card';
import { PageHeader } from '@/components/admin/PageHeader';

/**
 * Upload PDF and Create Template (Simplified Workflow)
 * 
 * One-step process: Upload PDF + Create PDF Template
 * No template builder needed - the PDF IS the template
 */
export default function UploadTemplatePDFPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const createTemplateMutation = useMutation({
    mutationFn: ({ file, name, description }: { file: File; name: string; description?: string }) =>
      consentService.createPDFTemplate(file, { name, description }),
    onSuccess: () => {
      router.push('/admin/system-config/consent-templates');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      // Auto-fill template name from filename if not set
      if (!templateName) {
        const nameWithoutExt = selectedFile.name.replace(/\.pdf$/i, '');
        setTemplateName(nameWithoutExt);
      }
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !templateName.trim()) {
      alert('Please select a PDF file and enter a template name');
      return;
    }
    createTemplateMutation.mutate({
      file,
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload PDF Consent Template"
        description="Upload a PDF consent form. The PDF will be used directly for patient signing - no template builder needed."
        backLink="/admin/system-config/consent-templates"
      />

      <form onSubmit={handleSubmit}>
        <Card padding="md">
          <div className="space-y-6">
            {/* Template Name */}
            <div>
              <label htmlFor="templateName" className="block text-sm font-medium text-neutral-900 mb-2">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="templateName"
                required
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., General Surgery Consent"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Template Description */}
            <div>
              <label htmlFor="templateDescription" className="block text-sm font-medium text-neutral-900 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
                placeholder="Brief description of this consent template..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                PDF File <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                  required
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <Upload className="h-12 w-12 text-neutral-400" />
                  <div>
                    <span className="text-primary font-medium">
                      Click to upload
                    </span>
                    <span className="text-neutral-600"> or drag and drop</span>
                  </div>
                  <p className="text-sm text-neutral-500">
                    PDF only (max 10MB)
                  </p>
                </label>
              </div>

              {file && (
                <div className="mt-4 p-4 bg-neutral-50 rounded-lg flex items-center gap-3">
                  <FileText className="h-5 w-5 text-neutral-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {createTemplateMutation.isError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    Failed to Create Template
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {createTemplateMutation.error instanceof Error
                      ? createTemplateMutation.error.message
                      : 'An error occurred while creating the template'}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!file || !templateName.trim() || createTemplateMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createTemplateMutation.isPending ? 'Creating Template...' : 'Create Template'}
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

      {/* Instructions */}
      <Card padding="md" className="bg-blue-50 border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          How it works
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>The PDF is stored securely and preserved as a legal reference</li>
          <li>A SHA-256 hash is calculated for integrity verification</li>
          <li>Patients will sign directly on the PDF using the interactive viewer</li>
          <li>No template builder needed - the PDF IS the template structure</li>
        </ul>
      </Card>
    </div>
  );
}

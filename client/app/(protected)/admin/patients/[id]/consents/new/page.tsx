'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { consentService } from '@/services/consent.service';
import { patientService } from '@/services/patient.service';
import { Card } from '@/components/layout/Card';
import { PageHeader } from '@/components/admin/PageHeader';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ErrorState } from '@/components/admin/ErrorState';

/**
 * Create Consent for Patient Page
 * 
 * Allows admin/doctor to generate a consent for a patient from a template.
 * The PDF file from the template will be used during signing.
 */
export default function CreatePatientConsentPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Fetch patient
  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientService.getPatient(patientId),
    enabled: !!patientId,
  });

  // Fetch templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['consent-templates', 'pdf'],
    queryFn: () => consentService.getPDFConsentTemplates(),
  });

  // Generate consent mutation
  const generateConsentMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // Prepare placeholder values from patient data
      const placeholderValues: Record<string, string> = {
        PATIENT_NAME: patient
          ? `${patient.firstName} ${patient.middleName || ''} ${patient.lastName}`.trim()
          : '',
        DATE: new Date().toLocaleDateString(),
        PATIENT_AGE: patient?.age?.toString() || '',
        PATIENT_DOB: patient?.dateOfBirth
          ? new Date(patient.dateOfBirth).toLocaleDateString()
          : '',
        PATIENT_EMAIL: patient?.email || '',
        PATIENT_PHONE: patient?.phone || '',
      };

      return consentService.generatePDFConsent({
        templateId,
        patientId,
        placeholderValues,
      });
    },
    onSuccess: (consent) => {
      // Navigate to consent view/signing page
      router.push(`/admin/patients/${patientId}/consents/${consent.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      alert('Please select a consent template');
      return;
    }
    generateConsentMutation.mutate(selectedTemplateId);
  };

  if (isLoadingPatient || isLoadingTemplates) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Create Consent"
          description="Loading..."
          backLink={`/admin/patients/${patientId}`}
        />
        <Card padding="md">
          <LoadingSpinner />
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Create Consent"
          description="Patient not found"
          backLink="/admin/patients"
        />
        <Card padding="md">
          <ErrorState
            title="Patient not found"
            message="The patient could not be found."
            onRetry={() => router.push('/admin/patients')}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Consent"
        description={`Generate consent for ${patient.firstName} ${patient.lastName}`}
        backLink={`/admin/patients/${patientId}`}
      />

      {/* Patient Info Card */}
      <Card padding="md" className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">Patient Information</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>
                <span className="font-medium">Name:</span> {patient.firstName}{' '}
                {patient.middleName || ''} {patient.lastName}
              </p>
              <p>
                <span className="font-medium">File Number:</span> {patient.fileNumber || patient.patientNumber}
              </p>
              {patient.age !== undefined && (
                <p>
                  <span className="font-medium">Age:</span> {patient.age} years
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Template Selection Form */}
      <Card padding="md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="template"
              className="block text-sm font-medium text-neutral-900 mb-2"
            >
              Select Consent Template <span className="text-red-500">*</span>
            </label>
            {!templates || templates.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      No templates available
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Please upload a consent template first.
                    </p>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => router.push('/admin/system-config/consent-templates/upload')}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      >
                        Upload Template
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <select
                id="template"
                required
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">-- Select a template --</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.description && ` - ${template.description}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Template Info */}
          {selectedTemplateId && templates && (
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
              {(() => {
                const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
                return selectedTemplate ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-900">
                      {selectedTemplate.name}
                    </p>
                    {selectedTemplate.description && (
                      <p className="text-sm text-neutral-600">
                        {selectedTemplate.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <CheckCircle className="h-4 w-4" />
                      <span>PDF file will be used for signing</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Error Display */}
          {generateConsentMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Failed to Generate Consent
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {generateConsentMutation.error instanceof Error
                    ? generateConsentMutation.error.message
                    : 'An error occurred while generating the consent'}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={
                !selectedTemplateId ||
                generateConsentMutation.isPending ||
                !templates ||
                templates.length === 0
              }
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generateConsentMutation.isPending
                ? 'Generating Consent...'
                : 'Generate Consent'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Card>

      {/* Instructions */}
      <Card padding="md" className="bg-blue-50 border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">How it works</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Select a consent template that was previously uploaded by an admin</li>
          <li>The PDF file from the template will be used for patient signing</li>
          <li>Patient information will be automatically filled into placeholders</li>
          <li>After generation, the consent will be ready for patient signing</li>
        </ul>
      </Card>
    </div>
  );
}






'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, CheckCircle, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { consentService } from '@/services/consent.service';
import { Card } from '@/components/layout/Card';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import type { PatientConsentInstance } from '@/types/consent';

/**
 * Patient Consent Signing Flow
 * 
 * Page-by-page review and signing interface
 */
export default function SignConsentPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const instanceId = params.id as string;

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [acknowledgedPages, setAcknowledgedPages] = useState<Set<string>>(new Set());

  // Get instance with full data
  const { data: instance, isLoading } = useQuery<PatientConsentInstance>({
    queryKey: ['consent', 'instance', instanceId],
    queryFn: () => consentService.getInstanceWithFullData(instanceId),
    enabled: !!instanceId,
  });

  // Get pages
  const pages = instance?.template?.pages || [];
  const currentPage = pages[currentPageIndex];

  // Acknowledge page mutation
  const acknowledgePageMutation = useMutation({
    mutationFn: (pageId: string) =>
      consentService.acknowledgePage(instanceId, pageId, {
        timeSpentSeconds: 30, // TODO: Track actual time
        scrollDepth: 100,
      }),
    onSuccess: (_, pageId) => {
      setAcknowledgedPages((prev) => new Set([...prev, pageId]));
      queryClient.invalidateQueries(['consent', 'instance', instanceId]);
    },
  });

  // Sign consent mutation
  const signMutation = useMutation({
    mutationFn: () =>
      consentService.signConsent({
        instanceId,
        partyType: 'PATIENT',
        signatureMethod: 'DIGITAL',
        signatureData: '', // TODO: Capture signature
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['consent', 'instance', instanceId]);
      router.push(`/consent/${instanceId}/complete`);
    },
  });

  const handleNextPage = () => {
    if (currentPage && !acknowledgedPages.has(currentPage.id)) {
      acknowledgePageMutation.mutate(currentPage.id);
    }

    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const handleSign = () => {
    if (window.confirm('Are you sure you want to sign this consent?')) {
      signMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card padding="md">
          <p className="text-red-600">Consent not found</p>
        </Card>
      </div>
    );
  }

  const allPagesAcknowledged = pages.every((page) =>
    acknowledgedPages.has(page.id)
  );
  const canSign = allPagesAcknowledged && instance.status !== 'SIGNED';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {instance.template?.name || 'Consent Form'}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Please review each page carefully before signing
          </p>
        </div>

        {/* Progress Indicator */}
        {pages.length > 1 && (
          <div className="flex items-center gap-2">
            {pages.map((page, index) => (
              <div
                key={page.id}
                className={`flex-1 h-2 rounded ${
                  index <= currentPageIndex
                    ? 'bg-primary'
                    : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
        )}

        {/* Page Content */}
        <Card padding="md">
          {currentPage ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">
                  {currentPage.title || `Page ${currentPage.pageNumber}`}
                </h2>
                <span className="text-sm text-neutral-500">
                  Page {currentPage.pageNumber} of {pages.length}
                </span>
              </div>

              <div className="prose max-w-none">
                <div
                  dangerouslySetInnerHTML={{
                    __html: currentPage.content || '',
                  }}
                />
              </div>

              {/* Page Acknowledgment */}
              {!acknowledgedPages.has(currentPage.id) && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Please review this page carefully, then click "Next" to
                    continue.
                  </p>
                </div>
              )}

              {acknowledgedPages.has(currentPage.id) && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-800">Page reviewed</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-neutral-600">No pages available</p>
          )}
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousPage}
            disabled={currentPageIndex === 0}
            className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          {currentPageIndex < pages.length - 1 ? (
            <button
              onClick={handleNextPage}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSign}
              disabled={!canSign || signMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4" />
              {signMutation.isPending ? 'Signing...' : 'Sign Consent'}
            </button>
          )}
        </div>

        {/* Status */}
        {instance.status === 'SIGNED' && (
          <Card padding="md" className="bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Consent Signed
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Signed on {new Date(instance.signedAt || '').toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}










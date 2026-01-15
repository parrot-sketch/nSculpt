'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useConsultation, useUpdateConsultation, useCompleteConsultation } from '@/hooks/useConsultations';
import {
  ArrowLeft,
  Calendar,
  User,
  FileText,
  Clock,
  CheckCircle2,
  Edit,
  Save,
  X,
  AlertCircle,
} from 'lucide-react';

export default function ConsultationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;

  const { data: consultation, isLoading, error } = useConsultation(consultationId);
  const updateMutation = useUpdateConsultation();
  const completeMutation = useCompleteConsultation();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    diagnosis: '',
    notes: '',
  });

  // Initialize form data when consultation loads
  useEffect(() => {
    if (consultation) {
      setFormData({
        chiefComplaint: consultation.chiefComplaint || '',
        diagnosis: consultation.diagnosis || '',
        notes: consultation.notes || '',
      });
    }
  }, [consultation]);

  const handleSave = async () => {
    if (!consultation) return;

    try {
      await updateMutation.mutateAsync({
        id: consultation.id,
        data: {
          ...formData,
          version: consultation.version,
        },
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update consultation:', error);
    }
  };

  const handleComplete = async () => {
    if (!consultation || !formData.diagnosis.trim()) {
      alert('Diagnosis is required to complete consultation');
      return;
    }

    if (!confirm('Are you sure you want to complete this consultation? This action cannot be undone.')) {
      return;
    }

    try {
      await completeMutation.mutateAsync({
        id: consultation.id,
        data: {
          diagnosis: formData.diagnosis,
          notes: formData.notes,
          version: consultation.version,
        },
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to complete consultation:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
      SCHEDULED: {
        label: 'Scheduled',
        className: 'bg-blue-100 text-blue-800',
        icon: Calendar,
      },
      IN_PROGRESS: {
        label: 'In Progress',
        className: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
      },
      COMPLETED: {
        label: 'Completed',
        className: 'bg-green-100 text-green-800',
        icon: CheckCircle2,
      },
      REQUIRES_FOLLOW_UP: {
        label: 'Follow-up Required',
        className: 'bg-purple-100 text-purple-800',
        icon: AlertCircle,
      },
      CANCELLED: {
        label: 'Cancelled',
        className: 'bg-red-100 text-red-800',
        icon: X,
      },
    };

    const config = statusConfig[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-800',
      icon: FileText,
    };

    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  const canEdit = consultation && (consultation.status === 'SCHEDULED' || consultation.status === 'IN_PROGRESS');
  const canComplete = consultation && consultation.status === 'IN_PROGRESS';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            {error instanceof Error ? error.message : 'Consultation not found'}
          </p>
          <Link
            href="/doctor/consultations"
            className="mt-4 inline-block text-primary hover:underline"
          >
            ← Back to Consultations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/doctor/consultations"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Consultations
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {consultation.consultationNumber}
            </h1>
            <p className="text-gray-600 mt-2">
              {getStatusBadge(consultation.status)}
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        chiefComplaint: consultation.chiefComplaint || '',
                        diagnosis: consultation.diagnosis || '',
                        notes: consultation.notes || '',
                      });
                    }}
                    className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Patient Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Patient Name</label>
                <p className="text-lg font-medium text-gray-900">
                  {consultation.patient.firstName} {consultation.patient.lastName}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Patient Number</label>
                <p className="text-lg font-medium text-gray-900">
                  {consultation.patient.patientNumber}
                </p>
              </div>
            </div>
          </div>

          {/* Clinical Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Clinical Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chief Complaint
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.chiefComplaint}
                    onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                    placeholder="Enter chief complaint..."
                  />
                ) : (
                  <p className="text-gray-900">
                    {consultation.chiefComplaint || (
                      <span className="text-gray-400 italic">Not specified</span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnosis
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                    placeholder="Enter diagnosis..."
                    required
                  />
                ) : (
                  <p className="text-gray-900">
                    {consultation.diagnosis || (
                      <span className="text-gray-400 italic">Not specified</span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinical Notes
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={6}
                    placeholder="Enter clinical notes..."
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {consultation.notes || (
                      <span className="text-gray-400 italic">No notes recorded</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Complete Consultation */}
          {canComplete && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                Ready to Complete
              </h3>
              <p className="text-yellow-800 mb-4">
                Ensure diagnosis and notes are complete before finalizing this consultation.
              </p>
              <button
                onClick={handleComplete}
                disabled={completeMutation.isPending || !formData.diagnosis.trim()}
                className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {completeMutation.isPending ? 'Completing...' : 'Complete Consultation'}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Consultation Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Consultation Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Consultation Type</label>
                <p className="text-gray-900 font-medium">
                  {consultation.consultationType.replace('_', ' ')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Date</label>
                <p className="text-gray-900 font-medium">
                  {new Date(consultation.consultationDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(consultation.consultationDate).toLocaleTimeString()}
                </p>
              </div>
              {consultation.completedAt && (
                <div>
                  <label className="text-sm text-gray-600">Completed At</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(consultation.completedAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(consultation.completedAt).toLocaleTimeString()}
                  </p>
                </div>
              )}
              {consultation.followUpRequired && consultation.followUpDate && (
                <div>
                  <label className="text-sm text-gray-600">Follow-up Date</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(consultation.followUpDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Billing Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Billing</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Billable</span>
                <span className={`text-sm font-medium ${consultation.billable ? 'text-green-600' : 'text-gray-400'}`}>
                  {consultation.billable ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Billed</span>
                <span className={`text-sm font-medium ${consultation.billed ? 'text-green-600' : 'text-gray-400'}`}>
                  {consultation.billed ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

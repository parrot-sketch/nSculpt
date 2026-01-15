'use client';

import { useState } from 'react';
import { usePrescriptionsByConsultation, usePrescriptionMutations } from '@/hooks/usePrescriptions';
import { MedicationForm, type MedicationData } from './MedicationForm';
import { PrescriptionStatus, MedicationType, type Prescription } from '@/services/prescription.service';
import { Plus, Pill, X, Edit2, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PrescriptionEditorProps {
  consultationId: string;
  patientId: string;
  readOnly?: boolean;
}

/**
 * Prescription Editor Component
 * 
 * Manages medications for a consultation.
 * Each medication is a separate prescription record.
 * 
 * Allows:
 * - Adding multiple medications
 * - Editing draft medications
 * - Viewing finalized medications (read-only)
 */
export function PrescriptionEditor({
  consultationId,
  patientId,
  readOnly = false,
}: PrescriptionEditorProps) {
  const { data: prescriptions, isLoading, refetch } = usePrescriptionsByConsultation(consultationId);
  const { createPrescription, updatePrescription, cancelPrescription } = usePrescriptionMutations();

  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Prescription | null>(null);

  const medications = prescriptions || [];
  const draftMedications = medications.filter((p) => p.status === PrescriptionStatus.PRESCRIBED);
  const finalizedMedications = medications.filter((p) => p.status !== PrescriptionStatus.PRESCRIBED && p.status !== PrescriptionStatus.CANCELLED);

  const canEdit = !readOnly && medications.length === 0 || draftMedications.length > 0;
  const isConsultationFinalized = medications.some((p) => p.status === PrescriptionStatus.DISPENSED || p.status === PrescriptionStatus.COMPLETED);

  const handleAddMedication = () => {
    setEditingMedication(null);
    setShowMedicationForm(true);
  };

  const handleEditMedication = (prescription: Prescription) => {
    if (prescription.status !== PrescriptionStatus.PRESCRIBED) {
      toast.error('Only draft prescriptions can be edited');
      return;
    }
    setEditingMedication(prescription);
    setShowMedicationForm(true);
  };

  const handleDeleteMedication = async (prescription: Prescription) => {
    if (prescription.status !== PrescriptionStatus.PRESCRIBED) {
      toast.error('Only draft prescriptions can be deleted');
      return;
    }

    if (!confirm('Are you sure you want to remove this medication?')) {
      return;
    }

    try {
      await cancelPrescription.mutateAsync(prescription.id);
      toast.success('Medication removed');
      refetch();
    } catch (error: any) {
      console.error('Failed to cancel prescription:', error);
      toast.error(error?.message || 'Failed to remove medication');
    }
  };

  const handleSaveMedication = async (medicationData: MedicationData) => {
    try {
      if (editingMedication) {
        // Update existing prescription
        await updatePrescription.mutateAsync({
          id: editingMedication.id,
          dto: {
            medicationName: medicationData.medicationName,
            medicationType: medicationData.medicationType,
            dosage: medicationData.dosage,
            frequency: medicationData.frequency,
            quantity: medicationData.quantity,
            duration: medicationData.duration,
            instructions: medicationData.instructions,
            version: editingMedication.version,
          },
        });
        toast.success('Medication updated');
      } else {
        // Create new prescription
        await createPrescription.mutateAsync({
          consultationId,
          medicationName: medicationData.medicationName,
          medicationType: medicationData.medicationType,
          dosage: medicationData.dosage,
          frequency: medicationData.frequency,
          quantity: medicationData.quantity,
          duration: medicationData.duration,
          instructions: medicationData.instructions,
        });
        toast.success('Medication added');
      }

      setShowMedicationForm(false);
      setEditingMedication(null);
      refetch();
    } catch (error: any) {
      console.error('Failed to save medication:', error);
      toast.error(error?.message || 'Failed to save medication');
    }
  };

  const handleCancelForm = () => {
    setShowMedicationForm(false);
    setEditingMedication(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Pill className="h-5 w-5 text-indigo-600" />
            Prescriptions
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            {medications.length === 0
              ? 'No medications prescribed yet'
              : `${medications.length} medication${medications.length !== 1 ? 's' : ''} prescribed`}
          </p>
        </div>
        {!readOnly && canEdit && !isConsultationFinalized && (
          <button
            onClick={handleAddMedication}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Medication
          </button>
        )}
      </div>

      {/* Medication Form */}
      {showMedicationForm && (
        <MedicationForm
          medication={editingMedication ? {
            medicationName: editingMedication.medicationName,
            medicationType: editingMedication.medicationType,
            dosage: editingMedication.dosage,
            frequency: editingMedication.frequency,
            quantity: editingMedication.quantity,
            duration: editingMedication.duration || '',
            instructions: editingMedication.instructions || '',
          } : undefined}
          onSave={handleSaveMedication}
          onCancel={handleCancelForm}
          isEditing={!!editingMedication}
        />
      )}

      {/* Medications List */}
      {medications.length > 0 && (
        <div className="space-y-3">
          {medications.map((prescription) => {
            const isDraft = prescription.status === PrescriptionStatus.PRESCRIBED;
            const canEditThis = !readOnly && isDraft && !isConsultationFinalized;

            return (
              <div
                key={prescription.id}
                className={`bg-white rounded-lg border p-4 ${isDraft ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-slate-900">
                        {prescription.medicationName}
                      </h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {prescription.medicationType}
                      </span>
                      {isDraft && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-600">
                      <div>
                        <span className="font-medium">Dosage:</span> {prescription.dosage}
                      </div>
                      <div>
                        <span className="font-medium">Frequency:</span> {prescription.frequency}
                      </div>
                      <div>
                        <span className="font-medium">Quantity:</span> {prescription.quantity}
                      </div>
                      {prescription.duration && (
                        <div>
                          <span className="font-medium">Duration:</span> {prescription.duration}
                        </div>
                      )}
                    </div>

                    {prescription.instructions && (
                      <div className="mt-2 text-sm text-slate-600">
                        <span className="font-medium">Instructions:</span>{' '}
                        <span className="text-slate-700">{prescription.instructions}</span>
                      </div>
                    )}
                  </div>

                  {canEditThis && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEditMedication(prescription)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit medication"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMedication(prescription)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove medication"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {medications.length === 0 && !showMedicationForm && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center">
          <Pill className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium mb-2">No medications prescribed</p>
          <p className="text-slate-500 text-sm">
            {readOnly
              ? 'No medications were prescribed during this consultation.'
              : 'Add medications to this prescription.'}
          </p>
        </div>
      )}
    </div>
  );
}

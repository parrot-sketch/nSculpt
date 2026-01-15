'use client';

import { useState } from 'react';
import { MedicationType } from '@/services/prescription.service';
import { X, Plus } from 'lucide-react';

export interface MedicationData {
  medicationName: string;
  medicationType: MedicationType;
  dosage: string;
  frequency: string;
  quantity: number;
  duration: string;
  instructions: string;
}

interface MedicationFormProps {
  medication?: MedicationData;
  onSave: (medication: MedicationData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

/**
 * Medication Form Component
 * 
 * Form for adding/editing a single medication in a prescription.
 * Used within PrescriptionEditor to add multiple medications.
 */
export function MedicationForm({
  medication,
  onSave,
  onCancel,
  isEditing = false,
}: MedicationFormProps) {
  const [formData, setFormData] = useState<MedicationData>({
    medicationName: medication?.medicationName || '',
    medicationType: medication?.medicationType || MedicationType.ORAL,
    dosage: medication?.dosage || '',
    frequency: medication?.frequency || '',
    quantity: medication?.quantity || 1,
    duration: medication?.duration || '',
    instructions: medication?.instructions || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof MedicationData, value: string | number | MedicationType) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.medicationName.trim()) {
      newErrors.medicationName = 'Medication name is required';
    }
    if (!formData.dosage.trim()) {
      newErrors.dosage = 'Dosage is required';
    }
    if (!formData.frequency.trim()) {
      newErrors.frequency = 'Frequency is required';
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-slate-900">
          {isEditing ? 'Edit Medication' : 'Add Medication'}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Medication Name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Medication Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.medicationName}
            onChange={(e) => handleChange('medicationName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.medicationName ? 'border-rose-300' : 'border-slate-300'
            }`}
            placeholder="e.g., Amoxicillin"
            required
          />
          {errors.medicationName && (
            <p className="mt-1 text-xs text-rose-600">{errors.medicationName}</p>
          )}
        </div>

        {/* Medication Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Type <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.medicationType}
            onChange={(e) => handleChange('medicationType', e.target.value as MedicationType)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value={MedicationType.ORAL}>Oral</option>
            <option value={MedicationType.INJECTION}>Injection</option>
            <option value={MedicationType.TOPICAL}>Topical</option>
            <option value={MedicationType.INHALATION}>Inhalation</option>
            <option value={MedicationType.IV}>IV</option>
            <option value={MedicationType.OTHER}>Other</option>
          </select>
        </div>

        {/* Dosage */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Dosage <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.dosage}
            onChange={(e) => handleChange('dosage', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.dosage ? 'border-rose-300' : 'border-slate-300'
            }`}
            placeholder="e.g., 500mg"
            required
          />
          {errors.dosage && (
            <p className="mt-1 text-xs text-rose-600">{errors.dosage}</p>
          )}
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Frequency <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.frequency}
            onChange={(e) => handleChange('frequency', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.frequency ? 'border-rose-300' : 'border-slate-300'
            }`}
            placeholder="e.g., twice daily"
            required
          />
          {errors.frequency && (
            <p className="mt-1 text-xs text-rose-600">{errors.frequency}</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Quantity <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', parseInt(e.target.value, 10) || 1)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.quantity ? 'border-rose-300' : 'border-slate-300'
            }`}
            required
          />
          {errors.quantity && (
            <p className="mt-1 text-xs text-rose-600">{errors.quantity}</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Duration
          </label>
          <input
            type="text"
            value={formData.duration}
            onChange={(e) => handleChange('duration', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., 5 days"
          />
        </div>

        {/* Instructions */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Instructions
          </label>
          <textarea
            value={formData.instructions}
            onChange={(e) => handleChange('instructions', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="e.g., Take with food, avoid alcohol..."
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          {isEditing ? 'Update Medication' : 'Add Medication'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

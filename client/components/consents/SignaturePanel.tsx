'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/modals/Modal';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { PenTool, Upload, Type, X } from 'lucide-react';
import type { PDFSignerType } from '@/types/consent';

interface SignaturePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (signatureData: {
    signerType: PDFSignerType;
    signerName: string;
    signatureUrl?: string;
    overrideFlag?: boolean;
    overrideReason?: string;
  }) => void;
  consentVersion?: number;
}

export function SignaturePanel({
  isOpen,
  onClose,
  onSign,
  consentVersion,
}: SignaturePanelProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'draw' | 'upload' | 'type'>('draw');
  const [signatureData, setSignatureData] = useState<string>('');
  const [signerName, setSignerName] = useState(user?.name || '');
  const [signerType, setSignerType] = useState<PDFSignerType>('PATIENT');
  const [overrideFlag, setOverrideFlag] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const { roles } = usePermissions();
  const isAdmin = roles.includes('ADMIN');
  const canOverride = isAdmin;

  const handleDrawStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleDrawMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleDrawEnd = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureData(canvas.toDataURL());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!signerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (mode === 'draw' && !signatureData) {
      alert('Please draw your signature');
      return;
    }

    if (mode === 'type' && !signatureData.trim()) {
      alert('Please enter your signature');
      return;
    }

    if (overrideFlag && !overrideReason.trim()) {
      alert('Please provide a reason for override');
      return;
    }

    onSign({
      signerType,
      signerName,
      signatureUrl: signatureData,
      overrideFlag: overrideFlag || undefined,
      overrideReason: overrideReason || undefined,
    });

    // Reset form
    setSignatureData('');
    setSignerName(getUserFullName());
    setOverrideFlag(false);
    setOverrideReason('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign Consent"
      size="lg"
    >
      <div className="space-y-6">
        {/* Signer Type Selection (Admin Only - for testing/workflow simulation) */}
        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Signing As (Admin - Testing Mode)
            </label>
            <select
              value={signerType}
              onChange={(e) => {
                const newType = e.target.value as PDFSignerType;
                setSignerType(newType);
                // Auto-update signer name based on role (use current user name for all roles in testing)
                const userFullName = getUserFullName();
                setSignerName(userFullName || '');
              }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-yellow-50 border-yellow-300"
            >
              <option value="PATIENT">Patient</option>
              <option value="GUARDIAN">Guardian</option>
              <option value="DOCTOR">Doctor/Surgeon</option>
              <option value="NURSE_WITNESS">Nurse Witness</option>
              {isAdmin && <option value="ADMIN">Admin (Override)</option>}
            </select>
            <p className="text-xs text-yellow-700 mt-1">
              Admin testing mode: You can sign as any party to test the workflow
            </p>
          </div>
        )}

        {/* Signer Info */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            {isAdmin ? 'Signer Name' : 'Your Name'}
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        {/* Signature Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Signature Method
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('draw')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                mode === 'draw'
                  ? 'border-primary bg-primary text-white'
                  : 'border-neutral-300 bg-white text-neutral-700'
              }`}
            >
              <PenTool className="w-4 h-4 mx-auto mb-1" />
              Draw
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                mode === 'upload'
                  ? 'border-primary bg-primary text-white'
                  : 'border-neutral-300 bg-white text-neutral-700'
              }`}
            >
              <Upload className="w-4 h-4 mx-auto mb-1" />
              Upload
            </button>
            <button
              onClick={() => setMode('type')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                mode === 'type'
                  ? 'border-primary bg-primary text-white'
                  : 'border-neutral-300 bg-white text-neutral-700'
              }`}
            >
              <Type className="w-4 h-4 mx-auto mb-1" />
              Type
            </button>
          </div>
        </div>

        {/* Signature Input */}
        <div>
          {mode === 'draw' && (
            <div className="border-2 border-neutral-300 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="border border-neutral-200 rounded cursor-crosshair w-full"
                onMouseDown={handleDrawStart}
                onMouseMove={handleDrawMove}
                onMouseUp={handleDrawEnd}
                onMouseLeave={handleDrawEnd}
              />
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                      setSignatureData('');
                    }
                  }
                }}
                className="mt-2 text-sm text-neutral-600 hover:text-neutral-800"
              >
                Clear
              </button>
            </div>
          )}

          {mode === 'upload' && (
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="signature-upload"
              />
              <label
                htmlFor="signature-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-neutral-400" />
                <span className="text-sm text-neutral-600">
                  Click to upload signature image
                </span>
              </label>
              {signatureData && (
                <div className="mt-4">
                  <img
                    src={signatureData}
                    alt="Signature"
                    className="max-h-32 mx-auto border border-neutral-200 rounded"
                  />
                </div>
              )}
            </div>
          )}

          {mode === 'type' && (
            <div>
              <input
                type="text"
                value={signatureData}
                onChange={(e) => setSignatureData(e.target.value)}
                placeholder="Type your signature"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-2xl font-signature"
              />
            </div>
          )}
        </div>

        {/* Admin Override */}
        {canOverride && (
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={overrideFlag}
                onChange={(e) => setOverrideFlag(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-neutral-700">
                Override signature order (Admin only)
              </span>
            </label>
            {overrideFlag && (
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for override (required)"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                rows={3}
                required
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Sign Consent
          </button>
        </div>
      </div>
    </Modal>
  );
}


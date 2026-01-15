'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, Pencil, Type as TypeIcon, Upload } from 'lucide-react';

interface SignatureDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: {
    name: string;
    data: string; // Base64 image
    type: 'draw' | 'type' | 'upload';
  }) => void;
}

export function SignatureDrawModal({ isOpen, onClose, onSave }: SignatureDrawModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [signatureName, setSignatureName] = useState('');
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Canvas setup
  useEffect(() => {
    if (isOpen && canvasRef.current && mode === 'draw') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas size
        canvas.width = 600;
        canvas.height = 200;
        
        // Set drawing style
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isOpen, mode]);

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // Prevent scrolling while drawing
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Generate typed signature
  const generateTypedSignature = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = '#000000';
    ctx.font = '48px "Dancing Script", cursive, sans-serif'; // Handwriting-style font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Save signature
  const handleSave = () => {
    if (!signatureName.trim()) {
      alert('Please enter a name for this signature');
      return;
    }

    let signatureData: string | null = null;

    if (mode === 'draw') {
      if (!hasDrawn) {
        alert('Please draw your signature');
        return;
      }
      signatureData = canvasRef.current?.toDataURL('image/png') || null;
    } else if (mode === 'type') {
      if (!typedSignature.trim()) {
        alert('Please type your signature');
        return;
      }
      signatureData = generateTypedSignature();
    } else if (mode === 'upload') {
      if (!uploadedImage) {
        alert('Please upload an image');
        return;
      }
      signatureData = uploadedImage;
    }

    if (!signatureData) {
      alert('Failed to generate signature');
      return;
    }

    onSave({
      name: signatureName,
      data: signatureData,
      type: mode,
    });

    // Reset and close
    setSignatureName('');
    setTypedSignature('');
    setUploadedImage(null);
    clearCanvas();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">Create Signature</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Signature Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Signature Name *
            </label>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="e.g., My Signature"
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Mode Selector */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3">
              Signature Method
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('draw')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  mode === 'draw'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-neutral-300 hover:border-neutral-400'
                }`}
              >
                <Pencil className="h-5 w-5" />
                <span className="font-medium">Draw</span>
              </button>
              <button
                onClick={() => setMode('type')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  mode === 'type'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-neutral-300 hover:border-neutral-400'
                }`}
              >
                <TypeIcon className="h-5 w-5" />
                <span className="font-medium">Type</span>
              </button>
              <button
                onClick={() => setMode('upload')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  mode === 'upload'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-neutral-300 hover:border-neutral-400'
                }`}
              >
                <Upload className="h-5 w-5" />
                <span className="font-medium">Upload</span>
              </button>
            </div>
          </div>

          {/* Draw Mode */}
          {mode === 'draw' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-neutral-700">
                  Draw your signature below
                </label>
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full border-2 border-neutral-300 rounded-lg cursor-crosshair touch-none bg-white"
                style={{ touchAction: 'none' }} // Prevent default touch behavior
              />
              <p className="text-xs text-neutral-500 mt-2">
                ✏️ Use your mouse, stylus, or finger to draw your signature
              </p>
            </div>
          )}

          {/* Type Mode */}
          {mode === 'type' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Type your signature
              </label>
              <input
                type="text"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 text-2xl font-['Dancing_Script'] border-2 border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ fontFamily: '"Dancing Script", cursive, sans-serif' }}
              />
              {typedSignature && (
                <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <p className="text-sm text-neutral-600 mb-2">Preview:</p>
                  <div className="bg-white p-4 rounded border border-neutral-300 text-center">
                    <span
                      className="text-4xl"
                      style={{ fontFamily: '"Dancing Script", cursive, sans-serif' }}
                    >
                      {typedSignature}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Mode */}
          {mode === 'upload' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Upload signature image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadedImage && (
                <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <p className="text-sm text-neutral-600 mb-2">Preview:</p>
                  <div className="bg-white p-4 rounded border border-neutral-300 flex items-center justify-center">
                    <img
                      src={uploadedImage}
                      alt="Uploaded signature"
                      className="max-h-32 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-700 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Check className="h-4 w-4" />
            Save Signature
          </button>
        </div>
      </div>

      {/* Load Dancing Script font for typed signatures */}
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap"
        rel="stylesheet"
      />
    </div>
  );
}



'use client';

import { useState, useRef, useEffect } from 'react';
import { X, PenTool, Type, Upload, Trash2 } from 'lucide-react';

interface Signature {
  id: string;
  name: string;
  data: string; // Base64 or SVG data
  type: 'draw' | 'type' | 'upload';
  createdAt: Date;
}

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: { name: string; data: string; type: 'draw' | 'type' | 'upload' }) => void;
  existingSignatures?: Signature[];
  onSelectSignature?: (signature: Signature) => void;
}

type SignatureTab = 'draw' | 'type' | 'upload';

/**
 * Signature Creation Modal
 * 
 * Enterprise-grade signature creation with three methods:
 * 1. Draw - Freehand signature drawing
 * 2. Type - Typed signature with font selection
 * 3. Upload - Upload signature image
 * 
 * Matches PDF House design and functionality.
 */
export function SignatureModal({
  isOpen,
  onClose,
  onSave,
  existingSignatures = [],
  onSelectSignature,
}: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState<SignatureTab>('draw');
  const [signatureName, setSignatureName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [typedText, setTypedText] = useState('');
  const [selectedFont, setSelectedFont] = useState('Dancing Script');
  const [selectedColor, setSelectedColor] = useState('black');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  // Font options for typed signatures
  const fonts = [
    'Dancing Script',
    'Great Vibes',
    'Allura',
    'Brush Script MT',
    'Lucida Handwriting',
    'Comic Sans MS',
  ];

  // Initialize canvas
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeTab, selectedColor]);

  // Handle drawing on canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTab !== 'draw' || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (drawingRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL('image/png');
      setSignatureData(dataURL);
    }
    drawingRef.current = false;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setSignatureData('');
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSignatureData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate typed signature preview
  useEffect(() => {
    if (activeTab === 'type' && typedText) {
      // Create a canvas to render typed text
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 400;
        canvas.height = 150;
        ctx.font = `48px "${selectedFont}"`;
        ctx.fillStyle = selectedColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedText, canvas.width / 2, canvas.height / 2);
        setSignatureData(canvas.toDataURL('image/png'));
      }
    }
  }, [activeTab, typedText, selectedFont, selectedColor]);

  const handleCreate = () => {
    if (!signatureName.trim()) {
      alert('Please enter a signature name');
      return;
    }

    if (activeTab === 'draw' && !signatureData) {
      alert('Please draw your signature');
      return;
    }

    if (activeTab === 'type' && !typedText.trim()) {
      alert('Please enter your signature text');
      return;
    }

    if (activeTab === 'upload' && !signatureData) {
      alert('Please upload a signature image');
      return;
    }

    onSave({
      name: signatureName.trim(),
      data: signatureData,
      type: activeTab,
    });

    // Reset form
    setSignatureName('');
    setSignatureData('');
    setTypedText('');
    setUploadedFile(null);
    clearCanvas();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">Create New Signature</h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'draw'
                ? 'bg-primary text-white border-b-2 border-primary'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <PenTool className="w-4 h-4" />
              Draw
            </div>
          </button>
          <button
            onClick={() => setActiveTab('type')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'type'
                ? 'bg-primary text-white border-b-2 border-primary'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Type className="w-4 h-4" />
              Type
            </div>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-primary text-white border-b-2 border-primary'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Draw Tab */}
          {activeTab === 'draw' && (
            <div className="space-y-4">
              <div className="border-2 border-neutral-300 rounded-lg bg-white">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={200}
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-700">Draw Signature*</label>
                <button
                  onClick={clearCanvas}
                  className="px-4 py-2 text-sm text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Type Tab */}
          {activeTab === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Enter Signature Text
                </label>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="Type your name"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Text Styles
                </label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ fontFamily: selectedFont }}
                >
                  {fonts.map((font) => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              {typedText && (
                <div className="border-2 border-neutral-300 rounded-lg bg-white p-8 flex items-center justify-center min-h-[150px]">
                  <span
                    style={{
                      fontFamily: selectedFont,
                      fontSize: '48px',
                      color: selectedColor,
                    }}
                  >
                    {typedText}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
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
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <Upload className="w-12 h-12 text-neutral-400" />
                  <div>
                    <span className="text-primary font-medium">Click to upload</span>
                    <span className="text-neutral-600"> or drag and drop</span>
                  </div>
                  <p className="text-sm text-neutral-500">PNG, JPG, GIF up to 10MB</p>
                </label>
              </div>
              {uploadedFile && (
                <div className="border-2 border-neutral-300 rounded-lg bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-700">{uploadedFile.name}</span>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setSignatureData('');
                      }}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {signatureData && (
                    <img
                      src={signatureData}
                      alt="Uploaded signature"
                      className="mt-4 max-h-32 mx-auto"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Color Selection */}
          <div className="mt-6 space-y-2">
            <label className="block text-sm font-medium text-neutral-700">Color</label>
            <div className="flex items-center gap-3">
              {['black', 'blue', 'red'].map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    selectedColor === color
                      ? 'border-primary scale-110'
                      : 'border-neutral-300 hover:border-neutral-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                />
              ))}
            </div>
          </div>

          {/* Signature Name */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Signature Name
            </label>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="e.g., My Signature"
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Signature List Component
 * 
 * Displays saved signatures for reuse
 */
export function SignatureList({
  signatures,
  onSelect,
  onCreateNew,
  onDelete,
}: {
  signatures: Signature[];
  onSelect: (signature: Signature) => void;
  onCreateNew: () => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-64 border-l border-neutral-200 bg-white flex flex-col z-10">
      <div className="p-4 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Signature List</h3>
        <button
          onClick={onCreateNew}
          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
        >
          New Signature
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {signatures.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-8">
            No signatures saved. Create one to get started.
          </p>
        ) : (
          signatures.map((signature) => (
            <div
              key={signature.id}
              className="border border-neutral-200 rounded-lg p-3 hover:border-primary transition-colors cursor-pointer group"
              onClick={() => onSelect(signature)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-900">{signature.name}</span>
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(signature.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:text-red-700 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="border border-neutral-200 rounded bg-white p-2 flex items-center justify-center min-h-[60px]">
                {signature.type === 'draw' || signature.type === 'upload' ? (
                  <img
                    src={signature.data}
                    alt={signature.name}
                    className="max-h-12 max-w-full object-contain"
                  />
                ) : (
                  <span
                    style={{
                      fontFamily: 'Dancing Script',
                      fontSize: '24px',
                      color: 'black',
                    }}
                  >
                    {signature.name}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


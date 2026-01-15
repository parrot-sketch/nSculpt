'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ErrorState } from '@/components/admin/ErrorState';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Download,
  Mail,
  CheckCircle2,
  AlertCircle,
  FileText,
  PenTool,
  User,
  Shield,
  Trash2,
} from 'lucide-react';
import type {
  PDFConsent,
  PDFConsentSignature,
  PDFSignerType,
} from '@/types/consent';
import { SignatureModal } from './SignatureModal';
import { SignatureDrawModal } from './SignatureDrawModal';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface SignatureField {
  id: string;
  signerType: PDFSignerType;
  signerName?: string;
  required: boolean;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signed: boolean;
  signedAt?: string;
  signedBy?: string;
  signatureData?: string; // Base64 image data
}

interface SignatureProgress {
  total: number;
  signed: number;
  pending: number;
  percentComplete: number;
}

interface EnhancedPDFViewerProps {
  consentId: string;
  consent: PDFConsent;
  signatureFields?: SignatureField[];
  onSignatureComplete?: (signature: PDFConsentSignature) => void;
}

// ============================================================================
// SIGNATURE PROGRESS COMPONENT
// ============================================================================

function SignatureProgressBar({ progress }: { progress: SignatureProgress }) {
  return (
    <div className="bg-white border-b border-neutral-200 px-6 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-neutral-900">Signature Progress</h3>
        </div>
        <span className="text-sm text-neutral-600">
          {progress.signed} of {progress.total} signatures
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 ease-out"
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>
      
      {/* Status Message */}
      <div className="mt-2 flex items-center gap-2">
        {progress.percentComplete === 100 ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-600 font-medium">
              All signatures collected! Ready to finalize.
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-600">
              {progress.pending} signature{progress.pending !== 1 ? 's' : ''} remaining
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SIGNATURE FIELD OVERLAY COMPONENT
// ============================================================================

function SignatureFieldOverlay({
  field,
  scale,
  onSign,
  isActive,
}: {
  field: SignatureField;
  scale: number;
  onSign: () => void;
  isActive: boolean;
}) {
  const getSignerColor = (type: PDFSignerType) => {
    const colors = {
      PATIENT: 'border-blue-500 bg-blue-500/10',
      GUARDIAN: 'border-purple-500 bg-purple-500/10',
      DOCTOR: 'border-emerald-500 bg-emerald-500/10',
      NURSE_WITNESS: 'border-amber-500 bg-amber-500/10',
      ADMIN: 'border-neutral-500 bg-neutral-500/10',
    };
    return colors[type] || colors.PATIENT;
  };

  const getSignerIcon = (type: PDFSignerType) => {
    switch (type) {
      case 'PATIENT':
      case 'GUARDIAN':
        return <User className="w-4 h-4" />;
      case 'DOCTOR':
      case 'NURSE_WITNESS':
        return <Shield className="w-4 h-4" />;
      default:
        return <PenTool className="w-4 h-4" />;
    }
  };

  const getSignerLabel = (type: PDFSignerType) => {
    return type.replace('_', ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div
      className={`
        absolute border-2 rounded-lg cursor-pointer transition-all duration-200
        ${field.signed ? 'border-emerald-500 bg-emerald-500/20' : getSignerColor(field.signerType)}
        ${isActive ? 'ring-4 ring-primary/30 shadow-lg scale-105' : 'hover:shadow-md hover:scale-102'}
      `}
      style={{
        left: `${field.x * scale}px`,
        top: `${field.y * scale}px`,
        width: `${field.width * scale}px`,
        height: `${field.height * scale}px`,
      }}
      onClick={field.signed ? undefined : onSign}
    >
      {/* Field Label */}
      <div className={`
        absolute -top-6 left-0 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap
        ${field.signed ? 'bg-emerald-600 text-white' : 'bg-neutral-900 text-white'}
      `}>
        {getSignerIcon(field.signerType)}
        <span className="ml-1">{getSignerLabel(field.signerType)}</span>
        {field.signed && <CheckCircle2 className="w-3 h-3 ml-1 inline" />}
      </div>

      {/* Field Content */}
      <div className="w-full h-full flex items-center justify-center p-2">
        {field.signed && field.signatureData ? (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={field.signatureData}
              alt="Signature"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : field.signed ? (
          <div className="text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-xs text-emerald-700 font-medium">Signed</p>
            {field.signedBy && (
              <p className="text-xs text-neutral-600">{field.signedBy}</p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <PenTool className="w-6 h-6 text-neutral-400 mx-auto mb-1" />
            <p className="text-xs text-neutral-600 font-medium">Click to Sign</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ENHANCED PDF VIEWER COMPONENT
// ============================================================================

export function EnhancedPDFViewer({
  consentId,
  consent,
  signatureFields: providedFields,
  onSignatureComplete,
}: EnhancedPDFViewerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const viewerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Signature storage interface
  interface SavedSignature {
    id: string;
    name: string;
    data: string; // Base64 image
    type: 'draw' | 'type' | 'upload';
    createdAt: Date;
  }

  // State
  const [sidebarTab, setSidebarTab] = useState<'thumbnails' | 'pointer'>('thumbnails');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(15);
  const [zoom, setZoom] = useState(1.0);
  const [viewerDimensions, setViewerDimensions] = useState({ width: 0, height: 0 });
  const [selectedField, setSelectedField] = useState<SignatureField | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showSignatureList, setShowSignatureList] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>(() => {
    // Load saved signatures from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pdfConsentSignatures');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse stored signatures:', e);
        }
      }
    }
    return [];
  });
  const [signedFields, setSignedFields] = useState<Map<string, SavedSignature>>(new Map());
  const [selectedSignatureToPlace, setSelectedSignatureToPlace] = useState<SavedSignature | null>(null);
  const [placedSignatures, setPlacedSignatures] = useState<Array<{
    id: string;
    signature: SavedSignature;
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>>([]);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  // Persist signatures to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && savedSignatures.length > 0) {
      localStorage.setItem('pdfConsentSignatures', JSON.stringify(savedSignatures));
    }
  }, [savedSignatures]);

  // Calculate optimal zoom based on container
  useEffect(() => {
    const updateDimensions = () => {
      if (viewerRef.current) {
        const { width, height } = viewerRef.current.getBoundingClientRect();
        setViewerDimensions({ width, height });
        
        // Auto-fit: A4 page is 595x842 points (8.27x11.69 inches at 72 DPI)
        const pageWidth = 595;
        const pageHeight = 842;
        const padding = 48; // 24px padding on each side
        
        const scaleX = (width - padding) / pageWidth;
        const scaleY = (height - padding) / pageHeight;
        const optimalScale = Math.min(scaleX, scaleY, 1.5); // Max 150%
        
        setZoom(optimalScale);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Fetch existing signatures
  const { data: existingSignatures = [] } = useQuery<PDFConsentSignature[]>({
    queryKey: ['pdf-consent-signatures', consentId],
    queryFn: async () => {
      // TODO: Implement API call
      return consent.signatures || [];
    },
    enabled: !!consentId,
  });

  // Build signature fields from template or provided fields
  const signatureFields: SignatureField[] = (providedFields || [
    // Mock data - Replace with actual template signature fields
    {
      id: 'patient-sig-1',
      signerType: 'PATIENT',
      required: true,
      pageNumber: 15,
      x: 100,
      y: 700,
      width: 200,
      height: 60,
      signed: false,
    },
    {
      id: 'doctor-sig-1',
      signerType: 'DOCTOR',
      required: true,
      pageNumber: 15,
      x: 350,
      y: 700,
      width: 200,
      height: 60,
      signed: false,
    },
  ]).map(field => {
    // Check for existing signature from backend
    const backendSignature = existingSignatures.find(
      sig => sig.signerType === field.signerType && sig.pageNumber === field.pageNumber
    );
    
    // Check for locally signed field
    const localSignature = signedFields.get(field.id);
    
    return {
      ...field,
      signed: !!backendSignature || !!localSignature,
      signedAt: backendSignature?.signedAt,
      signedBy: backendSignature?.signerName || localSignature?.name,
      signatureData: localSignature?.data,
    };
  });

  // Calculate progress
  const progress: SignatureProgress = {
    total: signatureFields.length,
    signed: signatureFields.filter(f => f.signed).length,
    pending: signatureFields.filter(f => !f.signed).length,
    percentComplete: signatureFields.length > 0
      ? (signatureFields.filter(f => f.signed).length / signatureFields.length) * 100
      : 0,
  };

  // Get PDF URL
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL_BROWSER || 'http://localhost:3002/api/v1')
    .replace('/api/v1', '');
  const relativePath = consent.finalPdfUrl || consent.generatedPdfUrl;
  const pdfUrl = relativePath 
    ? relativePath.startsWith('http') 
      ? relativePath
      : `${apiBaseUrl}${relativePath}`
    : null;

  // Can user sign?
  const canAnnotate =
    consent.status === 'DRAFT' ||
    consent.status === 'READY_FOR_SIGNATURE' ||
    consent.status === 'PARTIALLY_SIGNED';
  const isLocked = !!consent.lockedAt;

  // Handlers
  const handleSignField = (field: SignatureField) => {
    if (field.signed || !canAnnotate || isLocked) return;
    
    setSelectedField(field);
    
    // If we have saved signatures, show the signature list
    // Otherwise, show the modal to create a new signature
    if (savedSignatures.length > 0) {
      setShowSignatureList(true);
      setSelectedTool('sign');
    } else {
      setShowSignatureModal(true);
    }
  };

  const handleSignatureSave = async (signatureData: { name: string; data: string; type: 'draw' | 'type' | 'upload' }) => {
    try {
      // Create a new saved signature
      const newSignature: SavedSignature = {
        id: `sig-${Date.now()}`,
        name: signatureData.name,
        data: signatureData.data,
        type: signatureData.type,
        createdAt: new Date(),
      };

      // Add to saved signatures
      setSavedSignatures(prev => [...prev, newSignature]);

      // If we have a selected field, apply the signature to it
      if (selectedField) {
        await applySignatureToField(selectedField, newSignature);
      }

      setShowSignatureModal(false);
      setSelectedField(null);

      // Show success message
      console.log('Signature created and saved:', newSignature.name);
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Failed to save signature. Please try again.');
    }
  };

  const handleSelectSavedSignature = async (signature: SavedSignature) => {
    if (!selectedField) return;

    await applySignatureToField(selectedField, signature);
  };

  const applySignatureToField = async (field: SignatureField, signature: SavedSignature) => {
    try {
      // Call backend API to save the signature annotation (use browser URL)
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL_BROWSER || 'http://localhost:3002/api/v1')
        .replace('/api/v1', '');
      
      // Get auth token from sessionStorage
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${apiUrl}/api/v1/consents/${consentId}/annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          annotationType: 'SIGNATURE',
          content: JSON.stringify({
            signatureName: signature.name,
            signatureData: signature.data,
            signatureType: signature.type,
            fieldId: field.id,
            signerType: field.signerType,
          }),
          pageNumber: field.pageNumber,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save signature');
      }

      const result = await response.json();

      // Update local state to mark field as signed
      setSignedFields(prev => new Map(prev).set(field.id, signature));

      // Refresh annotations
      await queryClient.invalidateQueries({ queryKey: ['pdf-consent-annotations', consentId] });

      // Close modals and reset
      setShowSignatureModal(false);
      setShowSignatureList(false);
      setSelectedField(null);
      setSelectedTool(null);

      // Call completion callback
      if (onSignatureComplete) {
        onSignatureComplete(result);
      }

      console.log('Signature applied successfully to field:', field.id);
    } catch (error) {
      console.error('Error applying signature:', error);
      alert('Failed to apply signature. Please try again.');
    }
  };

  const handleDeleteSignature = (signatureId: string) => {
    if (confirm('Are you sure you want to delete this signature?')) {
      setSavedSignatures(prev => prev.filter(sig => sig.id !== signatureId));
    }
  };

  // Handle clicking on PDF to place signature
  const handlePdfClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    // Only place signature if Sign tool is active and signature is selected
    if (selectedTool !== 'sign' || !selectedSignatureToPlace || !canAnnotate || isLocked) {
      return;
    }

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    
    // Calculate click position relative to the PDF
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // PDF page dimensions (A4 size in points: 1 point = 1/72 inch)
    // A4 = 210mm x 297mm = 595.28 x 841.89 points
    const PDF_PAGE_WIDTH = 595;
    const PDF_PAGE_HEIGHT = 842;

    // Account for zoom and centering
    const pdfWidth = PDF_PAGE_WIDTH * zoom;
    const pdfHeight = PDF_PAGE_HEIGHT * zoom;
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    
    // Calculate offset if PDF is centered
    const offsetX = Math.max(0, (containerWidth - pdfWidth) / 2);
    const offsetY = Math.max(0, (containerHeight - pdfHeight) / 2);

    // Position relative to PDF canvas (HTML coordinates: top-left origin)
    const htmlX = (clickX - offsetX) / zoom;
    const htmlY = (clickY - offsetY) / zoom;

    // Signature dimensions (adjustable)
    const signatureWidth = 200;
    const signatureHeight = 60;

    // Check if click is within PDF bounds (using HTML coordinates)
    if (htmlX < 0 || htmlX > PDF_PAGE_WIDTH - signatureWidth || 
        htmlY < 0 || htmlY > PDF_PAGE_HEIGHT - signatureHeight) {
      console.log('Click outside PDF bounds');
      return;
    }

    // ⭐ CRITICAL: Convert HTML coordinates (top-left origin) to PDF coordinates (bottom-left origin)
    // PDF Y-axis increases upward from bottom, HTML Y-axis increases downward from top
    const pdfX = htmlX;
    const pdfY = PDF_PAGE_HEIGHT - htmlY - signatureHeight;

    console.log('Coordinate transformation:', {
      html: { x: htmlX, y: htmlY },
      pdf: { x: pdfX, y: pdfY },
      pageSize: { width: PDF_PAGE_WIDTH, height: PDF_PAGE_HEIGHT },
      signature: { width: signatureWidth, height: signatureHeight },
    });

    try {
      // Save signature placement to backend (use browser URL)
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL_BROWSER || 'http://localhost:3002/api/v1')
        .replace('/api/v1', '');
      
      console.log('Saving signature annotation:', {
        consentId,
        consentStatus: consent?.status,
        pageNumber: currentPage,
        pdfCoordinates: { x: pdfX, y: pdfY },
        htmlCoordinates: { x: htmlX, y: htmlY },
        signatureWidth,
        signatureHeight,
      });

      // Get auth token from sessionStorage
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${apiUrl}/api/v1/consents/${consentId}/annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          annotationType: 'SIGNATURE',
          content: JSON.stringify({
            signatureName: selectedSignatureToPlace.name,
            signatureData: selectedSignatureToPlace.data,
            signatureType: selectedSignatureToPlace.type,
          }),
          pageNumber: currentPage,
          x: pdfX,  // Use PDF coordinates (bottom-left origin)
          y: pdfY,  // Use PDF coordinates (bottom-left origin)
          width: signatureWidth,
          height: signatureHeight,
        }),
      });

      if (!response.ok) {
        // Get detailed error message from backend
        let errorMessage = 'Failed to save signature placement';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Backend error:', errorData);
        } catch (e) {
          console.error('Could not parse error response');
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Add to placed signatures (store in PDF coordinates for backend consistency)
      const newPlacement = {
        id: result.id || `placed-${Date.now()}`,
        signature: selectedSignatureToPlace,
        pageNumber: currentPage,
        x: pdfX,  // Store PDF coordinates
        y: pdfY,  // Store PDF coordinates
        width: signatureWidth,
        height: signatureHeight,
      };

      setPlacedSignatures(prev => [...prev, newPlacement]);

      console.log('Signature placed successfully at PDF coords:', { 
        pdf: { x: pdfX, y: pdfY }, 
        html: { x: htmlX, y: htmlY },
        page: currentPage 
      });
    } catch (error) {
      console.error('Error placing signature:', error);
      
      // Show user-friendly error message with details
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to place signature: ${errorMessage}\n\nConsent Status: ${consent?.status || 'Unknown'}\n\nNote: Signatures can only be added to consents in DRAFT, READY_FOR_SIGNATURE, or PARTIALLY_SIGNED status.`);
    }
  };

  // Handle selecting a signature for placement
  const handleSelectSignatureForPlacement = (signature: SavedSignature) => {
    setSelectedSignatureToPlace(signature);
    setShowSignatureList(false); // Close the sidebar
  };

  // Handle mouse move to show signature preview
  const handlePdfMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool !== 'sign' || !selectedSignatureToPlace) {
      setCursorPosition(null);
      return;
    }

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCursorPosition({ x, y });
  };

  const handleDownload = async () => {
    try {
      // Get auth token from sessionStorage
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      if (!token) {
        alert('Authentication required. Please log in.');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/api/v1/consents/${consentId}/download`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consent-${consentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download PDF.');
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow keys for navigation
      if (e.key === 'ArrowRight') {
        setCurrentPage(p => Math.min(totalPages, p + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(p => Math.max(1, p - 1));
      }
      // Zoom with +/-
      else if (e.key === '+' || e.key === '=') {
        setZoom(z => Math.min(2, z + 0.1));
      } else if (e.key === '-') {
        setZoom(z => Math.max(0.5, z - 0.1));
      }
      // Fullscreen with F
      else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  if (!pdfUrl) {
    return (
      <ErrorState
        title="PDF not available"
        message="The PDF document is not available for viewing."
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      {/* Top Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">NS</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">
              {consent.template?.name || 'Consent Document'}
            </h1>
            <p className="text-sm text-neutral-600">
              Patient: {consent.patient?.firstName} {consent.patient?.lastName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Send to email - Coming soon')}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            SEND TO EMAIL
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            DOWNLOAD
          </button>
        </div>
      </div>

      {/* Signature Progress Bar */}
      {signatureFields.length > 0 && <SignatureProgressBar progress={progress} />}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools & Thumbnails */}
        <div className="w-64 border-r border-neutral-200 bg-neutral-50 flex flex-col shrink-0">
          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-200">
            <button
              onClick={() => setSidebarTab('thumbnails')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                sidebarTab === 'thumbnails'
                  ? 'bg-primary text-white'
                  : 'bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Thumbnails
            </button>
            <button
              onClick={() => setSidebarTab('pointer')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                sidebarTab === 'pointer'
                  ? 'bg-primary text-white'
                  : 'bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Pointer
            </button>
          </div>

          {/* Tools Section */}
          <div className="p-3 border-b border-neutral-200">
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'add-text', icon: 'T', label: 'Text' },
                { id: 'pencil', icon: '✏️', label: 'Pencil' },
                { id: 'eraser', icon: '⌫', label: 'Eraser' },
                { id: 'highlight', icon: '🖍', label: 'Highlight' },
                { id: 'shapes', icon: '◻', label: 'Shapes' },
                { id: 'image', icon: '🖼', label: 'Image' },
                { id: 'hyperlink', icon: '🔗', label: 'Link' },
                { id: 'sign', icon: '✍️', label: 'Sign' },
                { id: 'stamp', icon: '⏹', label: 'Stamp' },
                { id: 'crop', icon: '✂', label: 'Crop' },
                { id: 'redact', icon: '▓', label: 'Redact' },
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    const newTool = selectedTool === tool.id ? null : tool.id;
                    setSelectedTool(newTool as any);
                    if (tool.id === 'sign' && newTool === 'sign') {
                      setShowSignatureList(true);
                      // If no signatures exist, prompt to create one
                      if (savedSignatures.length === 0) {
                        setTimeout(() => setShowSignatureModal(true), 100);
                      }
                    } else if (tool.id !== 'sign') {
                      setShowSignatureList(false);
                      setSelectedSignatureToPlace(null);
                    }
                  }}
                  disabled={!canAnnotate || isLocked}
                  className={`p-2 rounded-lg border-2 transition-colors text-lg ${
                    selectedTool === tool.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                  } ${!canAnnotate || isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={tool.label}
                >
                  {tool.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Thumbnails Section */}
          {sidebarTab === 'thumbnails' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-full aspect-[3/4] border-2 rounded-lg overflow-hidden transition-colors ${
                    currentPage === pageNum
                      ? 'border-primary bg-primary/5'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                    <span className="text-xs text-neutral-500">Page {pageNum}</span>
                  </div>
                  <div className="text-xs text-center py-1 text-neutral-600 bg-white">{pageNum}</div>
                </button>
              ))}
            </div>
          )}

          {/* Pointer Section */}
          {sidebarTab === 'pointer' && (
            <div className="flex-1 p-3">
              <p className="text-sm text-neutral-600">Pointer tools and selection options</p>
            </div>
          )}

          {/* Zoom Controls in Sidebar */}
          <div className="border-t border-neutral-200 p-3 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                  className="p-1 text-neutral-600 hover:text-neutral-900 text-lg"
                  title="Zoom out"
                >
                  −
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <button
                  onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                  className="p-1 text-neutral-600 hover:text-neutral-900 text-lg"
                  title="Zoom in"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Viewer - Main Area */}
        <div ref={viewerRef} className="flex-1 flex flex-col bg-neutral-100 overflow-hidden">
          {/* PDF Container */}
          <div className="flex-1 overflow-auto">
            <div className="min-h-full flex items-center justify-center p-8">
              <div 
                className="relative" 
                style={{ maxWidth: '100%' }}
                onClick={handlePdfClick}
                onMouseMove={handlePdfMouseMove}
                onMouseLeave={() => setCursorPosition(null)}
              >
                {/* PDF Iframe */}
                <div
                  className="bg-white shadow-2xl rounded-lg overflow-hidden"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-out',
                    cursor: selectedTool === 'sign' && selectedSignatureToPlace ? 'crosshair' : 'default',
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    src={pdfUrl}
                    className="border-0 pointer-events-none"
                    style={{
                      width: '595px', // A4 width in points
                      height: '842px', // A4 height in points
                    }}
                    title="PDF Consent Document"
                  />
                </div>

                {/* Signature Field Overlays (Pre-defined fields) */}
                {signatureFields
                  .filter(field => field.pageNumber === currentPage)
                  .map(field => (
                    <SignatureFieldOverlay
                      key={field.id}
                      field={field}
                      scale={zoom}
                      onSign={() => handleSignField(field)}
                      isActive={selectedField?.id === field.id}
                    />
                  ))}

                {/* Placed Signatures (Click-to-place) */}
                {placedSignatures
                  .filter(placement => placement.pageNumber === currentPage)
                  .map(placement => (
                    <div
                      key={placement.id}
                      className="absolute border-2 border-emerald-500 bg-emerald-500/10 rounded-lg pointer-events-none"
                      style={{
                        left: `${placement.x * zoom}px`,
                        top: `${placement.y * zoom}px`,
                        width: `${placement.width * zoom}px`,
                        height: `${placement.height * zoom}px`,
                      }}
                    >
                      <img
                        src={placement.signature.data}
                        alt={placement.signature.name}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                  ))}

                {/* Signature Cursor Preview */}
                {selectedTool === 'sign' && selectedSignatureToPlace && cursorPosition && (
                  <div
                    className="absolute border-2 border-primary border-dashed bg-primary/10 rounded-lg pointer-events-none"
                    style={{
                      left: `${cursorPosition.x - 100}px`,
                      top: `${cursorPosition.y - 30}px`,
                      width: '200px',
                      height: '60px',
                      opacity: 0.7,
                    }}
                  >
                    <img
                      src={selectedSignatureToPlace.data}
                      alt="Preview"
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                )}

                {/* Sign Tool Active Hint */}
                {selectedTool === 'sign' && !selectedSignatureToPlace && !selectedField && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10 rounded-lg">
                    <div className="bg-white px-6 py-4 rounded-lg shadow-xl border-2 border-primary">
                      <p className="text-center text-neutral-900 font-medium">✍️ Sign Tool Active</p>
                      <p className="text-center text-sm text-neutral-600 mt-1">
                        Select a signature from the right sidebar →
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className={`border-t border-neutral-200 bg-white px-6 py-3 flex items-center justify-between shrink-0 ${showSignatureList ? 'mr-64' : ''}`}>
            {/* Page Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page (←)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={currentPage}
                  onChange={e => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-16 px-2 py-1 text-center text-sm border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  min={1}
                  max={totalPages}
                />
                <span className="text-sm text-neutral-600">/ {totalPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page (→)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Zoom out (-)"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={zoom}
                  onChange={e => setZoom(parseFloat(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm text-neutral-700 w-12 text-center font-medium">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <button
                onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Zoom in (+)"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Fullscreen (F)"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Signature List */}
        {showSignatureList && selectedTool === 'sign' && (
          <div className="w-64 border-l border-neutral-200 bg-white flex flex-col shrink-0">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900">Signature List</h3>
              <p className="text-xs text-neutral-600 mt-1">
                {selectedField 
                  ? 'Select a signature to apply to field' 
                  : selectedSignatureToPlace
                  ? '✓ Click on PDF to place signature'
                  : 'Select a signature, then click on PDF'}
              </p>
              {selectedSignatureToPlace && !selectedField && (
                <div className="mt-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded flex items-center gap-1">
                  <span>🖱️</span>
                  <span>Click anywhere on the PDF to place</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <button
                onClick={() => setShowSignatureModal(true)}
                className="w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg text-primary hover:border-primary hover:bg-primary/5 transition-colors font-medium text-sm"
              >
                + New Signature
              </button>
              
              {savedSignatures.length === 0 ? (
                <p className="text-xs text-neutral-500 mt-4 text-center py-4">
                  No signatures saved yet. Create one to get started.
                </p>
              ) : (
                <>
                  <div className="text-xs font-medium text-neutral-700 mt-4 mb-2">
                    Saved Signatures ({savedSignatures.length})
                  </div>
                  {savedSignatures.map((signature) => (
                    <div
                      key={signature.id}
                      className={`border-2 rounded-lg p-3 transition-all cursor-pointer group ${
                        selectedSignatureToPlace?.id === signature.id
                          ? 'border-primary bg-primary/10'
                          : 'border-neutral-200 hover:border-primary hover:bg-primary/5'
                      }`}
                      onClick={() => {
                        // If clicking on a signature field, apply directly
                        if (selectedField) {
                          handleSelectSavedSignature(signature);
                        } else {
                          // Otherwise, select for placement
                          handleSelectSignatureForPlacement(signature);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-neutral-900 truncate">
                          {signature.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSignature(signature.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:text-red-700 transition-opacity"
                          title="Delete signature"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="border border-neutral-200 rounded bg-white p-2 flex items-center justify-center min-h-[60px]">
                        <img
                          src={signature.data}
                          alt={signature.name}
                          className="max-h-12 max-w-full object-contain"
                        />
                      </div>
                      <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between">
                        <span className="capitalize">{signature.type}</span>
                        <span>{new Date(signature.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Signature Draw Modal */}
      <SignatureDrawModal
        isOpen={showSignatureModal}
        onClose={() => {
          setShowSignatureModal(false);
          setSelectedField(null);
        }}
        onSave={(signature) => {
          const newSignature = {
            ...signature,
            id: `sig-${Date.now()}`,
            createdAt: new Date(),
          };
          setSavedSignatures(prev => [...prev, newSignature]);
          setShowSignatureModal(false);
          console.log('Signature created:', newSignature.name);
        }}
      />

      {/* Keyboard Shortcuts Help (Optional) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-neutral-900/90 text-white text-xs px-3 py-2 rounded-lg">
          <p>← → : Navigate pages</p>
          <p>+ - : Zoom</p>
          <p>F : Fullscreen</p>
        </div>
      )}
    </div>
  );
}


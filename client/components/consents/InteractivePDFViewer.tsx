'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Search,
  MessageSquare,
  Eye,
  Type,
  Edit3,
  Eraser,
  Pencil,
  Highlighter,
  Shapes,
  Image as ImageIcon,
  Link as LinkIcon,
  PenTool,
  Stamp,
  Crop,
  FileX,
  Grid3x3,
  List,
  Bookmark,
  Layers,
  CheckSquare,
} from 'lucide-react';
import type {
  PDFConsent,
  PDFConsentAnnotation,
  CreateAnnotationDto,
  UpdateAnnotationDto,
} from '@/types/consent';
import { SignatureModal, SignatureList } from './SignatureModal';

interface InteractivePDFViewerProps {
  consentId: string;
  consent: PDFConsent;
  onAnnotationChange?: (annotations: PDFConsentAnnotation[]) => void;
}

type SidebarTab = 'thumbnails' | 'pointer';
type ToolType =
  | 'add-text'
  | 'edit-text'
  | 'eraser'
  | 'pencil'
  | 'highlight'
  | 'shapes'
  | 'image'
  | 'hyperlink'
  | 'sign'
  | 'stamp'
  | 'crop'
  | 'redact'
  | null;

/**
 * Interactive PDF Viewer Component
 * 
 * Clean, document-editor-like interface matching PDF House design.
 * Features:
 * - Left sidebar with thumbnails and tools
 * - Top toolbar with actions
 * - Main PDF viewing area
 * - Bottom footer with page/zoom controls
 */
export function InteractivePDFViewer({
  consentId,
  consent,
  onAnnotationChange,
}: InteractivePDFViewerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('thumbnails');
  const [selectedTool, setSelectedTool] = useState<ToolType>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(15); // Will be updated when PDF loads
  const [zoom, setZoom] = useState(0.93); // 93% default like reference
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showSignatureList, setShowSignatureList] = useState(false);
  const [savedSignatures, setSavedSignatures] = useState<Array<{
    id: string;
    name: string;
    data: string;
    type: 'draw' | 'type' | 'upload';
    createdAt: Date;
  }>>(() => {
    // Load saved signatures from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('saved-signatures');
      if (saved) {
        try {
          return JSON.parse(saved).map((sig: any) => ({
            ...sig,
            createdAt: new Date(sig.createdAt),
          }));
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });

  // Check if annotations are allowed
  const canAnnotate =
    consent.status === 'DRAFT' ||
    consent.status === 'READY_FOR_SIGNATURE' ||
    consent.status === 'PARTIALLY_SIGNED';
  const isLocked = consent.lockedAt !== null && consent.lockedAt !== undefined;

  // Fetch annotations
  const {
    data: annotations = [],
    isLoading: isLoadingAnnotations,
    error: annotationsError,
  } = useQuery<PDFConsentAnnotation[]>({
    queryKey: ['pdf-consent-annotations', consentId],
    queryFn: async () => {
      const { consentService } = await import('@/services/consent.service');
      return consentService.getPDFConsentAnnotations(consentId);
    },
    enabled: !!consentId,
  });

  // Get PDF URL - Static files are served at root, not under /api/v1
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL_BROWSER || 'http://localhost:3002/api/v1')
    .replace('/api/v1', ''); // Remove /api/v1 prefix for static files
  const relativePath = consent.downloadUrl || consent.finalPdfUrl || consent.generatedPdfUrl;
  const pdfUrl = relativePath 
    ? relativePath.startsWith('http') 
      ? relativePath // Already absolute URL
      : `${apiBaseUrl}${relativePath}` // Prepend base URL (without /api/v1) to relative path
    : null;

  // Tools configuration
  const tools: Array<{
    id: ToolType;
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
  }> = [
    { id: 'add-text', label: 'Add Text', icon: <Type className="w-5 h-5" /> },
    { id: 'edit-text', label: 'Edit text', icon: <Edit3 className="w-5 h-5" /> },
    { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-5 h-5" /> },
    { id: 'pencil', label: 'Pencil', icon: <Pencil className="w-5 h-5" /> },
    { id: 'highlight', label: 'Highlight', icon: <Highlighter className="w-5 h-5" /> },
    { id: 'shapes', label: 'Shapes', icon: <Shapes className="w-5 h-5" /> },
    { id: 'image', label: 'Image', icon: <ImageIcon className="w-5 h-5" /> },
    { id: 'hyperlink', label: 'Hyperlink', icon: <LinkIcon className="w-5 h-5" /> },
    { id: 'sign', label: 'Sign', icon: <PenTool className="w-5 h-5" /> },
    { id: 'stamp', label: 'Stamp', icon: <Stamp className="w-5 h-5" /> },
    { id: 'crop', label: 'Crop', icon: <Crop className="w-5 h-5" /> },
    { id: 'redact', label: 'Redact', icon: <FileX className="w-5 h-5" /> },
  ];

  const handleDownload = async () => {
    try {
      const { consentService } = await import('@/services/consent.service');
      const blob = await consentService.downloadPDFConsent(consentId);
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

  if (isLoadingAnnotations) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (annotationsError) {
    return (
      <ErrorState
        title="Failed to load annotations"
        message="Unable to load annotations for this document."
        onRetry={() => {
          queryClient.invalidateQueries({
            queryKey: ['pdf-consent-annotations', consentId],
          });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Header - PDF House style */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3 flex items-center justify-between">
        {/* Logo/Branding */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">NS</span>
          </div>
          <span className="text-lg font-semibold text-neutral-900">Nairobi Sculpt EHR</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              // TODO: Implement send to email
              alert('Send to email feature coming soon');
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            SEND TO EMAIL
          </button>
          <div className="relative">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center gap-2"
            >
              DOWNLOAD
              <ChevronRight className="w-4 h-4 rotate-90" />
            </button>
          </div>

          {/* Icons */}
          <div className="flex items-center gap-2 ml-4">
            <button
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Comments"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              title="View"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-neutral-200 bg-neutral-50 flex flex-col">
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
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    const newTool = selectedTool === tool.id ? null : tool.id;
                    setSelectedTool(newTool);
                    if (tool.id === 'sign' && newTool === 'sign') {
                      setShowSignatureList(true);
                    }
                  }}
                  disabled={!canAnnotate || isLocked}
                  className={`p-2 rounded-lg border-2 transition-colors ${
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
                  <div className="text-xs text-center py-1 text-neutral-600">{pageNum}</div>
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

          {/* Page Controls */}
          <div className="border-t border-neutral-200 p-3 space-y-3">
            {/* Zoom Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                  className="p-1 text-neutral-600 hover:text-neutral-900"
                >
                  <span className="text-lg">−</span>
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
                  className="p-1 text-neutral-600 hover:text-neutral-900"
                >
                  <span className="text-lg">+</span>
                </button>
              </div>
            </div>

            {/* View Options */}
            <div className="flex items-center gap-2">
              <button className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded">
                <List className="w-4 h-4" />
              </button>
              <button className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded">
                <Bookmark className="w-4 h-4" />
              </button>
              <button className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded">
                <Layers className="w-4 h-4" />
              </button>
            </div>

            {/* Multi-Select Pages */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-600">Multi-Select Pages</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 1, 3, 5-10"
                  className="flex-1 px-2 py-1 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button className="p-1 text-neutral-600 hover:text-neutral-900">
                  <CheckSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main PDF Viewing Area */}
        <div className="flex-1 flex bg-neutral-100 relative">
          <div className={`flex-1 overflow-auto p-8 flex items-center justify-center ${showSignatureList && selectedTool === 'sign' ? 'mr-64' : ''}`}>
            {pdfUrl ? (
              <div
                className="bg-white shadow-lg"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center',
                  transition: 'transform 0.2s',
                }}
              >
                <iframe
                  src={pdfUrl}
                  className="w-[800px] h-[1056px] border-0"
                  title="PDF Viewer"
                  onLoad={() => {
                    // TODO: Extract total pages from PDF
                    // For now, using default
                  }}
                />
              </div>
            ) : (
              <ErrorState
                title="PDF not available"
                message="The PDF document is not available for viewing."
              />
            )}
          </div>

          {/* Bottom Footer - Page/Zoom Controls */}
          <div className={`absolute bottom-0 left-0 border-t border-neutral-200 bg-white px-6 py-2 flex items-center justify-between ${showSignatureList && selectedTool === 'sign' ? 'right-64' : 'right-0'}`}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-neutral-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-700">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="p-1 text-neutral-600 hover:text-neutral-900"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                className="p-1 text-neutral-600 hover:text-neutral-900"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => document.documentElement.requestFullscreen?.()}
                className="p-1 text-neutral-600 hover:text-neutral-900"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
            </div>
          </div>

          {/* Signature List Sidebar (Right) */}
          {showSignatureList && selectedTool === 'sign' && (
            <SignatureList
              signatures={savedSignatures}
              onSelect={(signature) => {
                // TODO: Place signature on PDF at click location
                console.log('Selected signature:', signature);
                setShowSignatureList(false);
                setSelectedTool(null);
              }}
              onCreateNew={() => setShowSignatureModal(true)}
              onDelete={(id) => {
                const updated = savedSignatures.filter((s) => s.id !== id);
                setSavedSignatures(updated);
                localStorage.setItem('saved-signatures', JSON.stringify(updated));
              }}
            />
          )}
        </div>

      {/* Signature Creation Modal */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={(signature) => {
          const newSignature = {
            id: `sig-${Date.now()}`,
            ...signature,
            createdAt: new Date(),
          };
          setSavedSignatures((prev) => [...prev, newSignature]);
          // Save to localStorage for persistence
          localStorage.setItem('saved-signatures', JSON.stringify([...savedSignatures, newSignature]));
        }}
        existingSignatures={savedSignatures}
        onSelectSignature={(signature) => {
          // TODO: Place signature on PDF
          console.log('Selected signature:', signature);
          setShowSignatureModal(false);
        }}
      />

      {/* Tool Selection Indicator */}
      {selectedTool && selectedTool !== 'sign' && (
        <div className="fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg">
          <span className="text-sm font-medium">
            {tools.find((t) => t.id === selectedTool)?.label} tool selected
          </span>
        </div>
      )}
    </div>
  );
}

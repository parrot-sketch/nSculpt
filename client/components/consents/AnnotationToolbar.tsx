'use client';

import { useState } from 'react';
import {
  Highlighter,
  MessageSquare,
  Type,
  Pencil,
  ArrowRight,
  Square,
  Circle,
  X,
} from 'lucide-react';

export type AnnotationTool =
  | 'HIGHLIGHT'
  | 'COMMENT'
  | 'TEXT_EDIT'
  | 'DRAWING'
  | 'ARROW'
  | 'RECTANGLE'
  | 'CIRCLE'
  | null;

interface AnnotationToolbarProps {
  selectedTool: AnnotationTool;
  onToolSelect: (tool: AnnotationTool) => void;
  disabled?: boolean;
  onClear?: () => void;
}

/**
 * Annotation Toolbar Component
 * 
 * Provides tools for annotating PDF documents.
 * Follows existing button styling patterns.
 */
export function AnnotationToolbar({
  selectedTool,
  onToolSelect,
  disabled = false,
  onClear,
}: AnnotationToolbarProps) {
  const tools: Array<{
    id: AnnotationTool;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'HIGHLIGHT',
      label: 'Highlight',
      icon: <Highlighter className="w-4 h-4" />,
    },
    {
      id: 'COMMENT',
      label: 'Comment',
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: 'TEXT_EDIT',
      label: 'Text Edit',
      icon: <Type className="w-4 h-4" />,
    },
    {
      id: 'DRAWING',
      label: 'Drawing',
      icon: <Pencil className="w-4 h-4" />,
    },
    {
      id: 'ARROW',
      label: 'Arrow',
      icon: <ArrowRight className="w-4 h-4" />,
    },
    {
      id: 'RECTANGLE',
      label: 'Rectangle',
      icon: <Square className="w-4 h-4" />,
    },
    {
      id: 'CIRCLE',
      label: 'Circle',
      icon: <Circle className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex items-center gap-2 p-2 bg-white border border-neutral-200 rounded-lg shadow-sm">
      {/* Pointer tool (default/none) */}
      <button
        onClick={() => onToolSelect(null)}
        disabled={disabled}
        className={`px-3 py-2 rounded-lg border-2 transition-colors ${
          selectedTool === null
            ? 'border-primary bg-primary text-white'
            : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Pointer (Select mode)"
      >
        <span className="text-xs font-medium">Select</span>
      </button>

      <div className="w-px h-6 bg-neutral-300" />

      {/* Annotation tools */}
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolSelect(tool.id)}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg border-2 transition-colors ${
            selectedTool === tool.id
              ? 'border-primary bg-primary text-white'
              : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}

      {/* Clear/Close tool */}
      {selectedTool && onClear && (
        <>
          <div className="w-px h-6 bg-neutral-300" />
          <button
            onClick={onClear}
            disabled={disabled}
            className="px-3 py-2 rounded-lg border-2 border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}









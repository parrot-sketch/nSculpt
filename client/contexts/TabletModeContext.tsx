'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Tablet Mode Context
 * 
 * Manages the tablet mode state (Patient Mode vs Front Desk Mode).
 * Used for the patient self-registration workflow where:
 * 1. Front desk staff switches to "Patient Mode"
 * 2. Patient uses tablet to register
 * 3. After registration, mode automatically returns to "Front Desk Mode"
 */

export type TabletMode = 'frontdesk' | 'patient';

interface TabletModeContextType {
  mode: TabletMode;
  setMode: (mode: TabletMode) => void;
  isPatientMode: boolean;
  isFrontDeskMode: boolean;
  switchToPatientMode: () => void;
  switchToFrontDeskMode: () => void;
}

const TabletModeContext = createContext<TabletModeContextType | undefined>(undefined);

const STORAGE_KEY = 'tablet_mode';
const MODE_TIMEOUT = 30 * 60 * 1000; // 30 minutes - auto-return to front desk mode

export function TabletModeProvider({ children }: { children: ReactNode }) {
  // Initialize mode from sessionStorage or default to frontdesk
  const [mode, setModeState] = useState<TabletMode>(() => {
    if (typeof window === 'undefined') return 'frontdesk';
    
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'patient' || stored === 'frontdesk') {
      return stored as TabletMode;
    }
    return 'frontdesk';
  });

  // Save mode to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode]);

  // Auto-return to front desk mode after timeout (if in patient mode)
  useEffect(() => {
    if (mode === 'patient') {
      const timeout = setTimeout(() => {
        setModeState('frontdesk');
      }, MODE_TIMEOUT);

      return () => clearTimeout(timeout);
    }
  }, [mode]);

  const setMode = (newMode: TabletMode) => {
    setModeState(newMode);
  };

  const switchToPatientMode = () => {
    setModeState('patient');
  };

  const switchToFrontDeskMode = () => {
    setModeState('frontdesk');
  };

  const value: TabletModeContextType = {
    mode,
    setMode,
    isPatientMode: mode === 'patient',
    isFrontDeskMode: mode === 'frontdesk',
    switchToPatientMode,
    switchToFrontDeskMode,
  };

  return (
    <TabletModeContext.Provider value={value}>
      {children}
    </TabletModeContext.Provider>
  );
}

export function useTabletMode() {
  const context = useContext(TabletModeContext);
  if (context === undefined) {
    throw new Error('useTabletMode must be used within a TabletModeProvider');
  }
  return context;
}







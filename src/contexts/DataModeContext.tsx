import React, { createContext, useContext, useState, useEffect } from 'react';
import { clearAllCache } from '@/utils/clearAllCache';
import { useToast } from '@/hooks/use-toast';

interface DataModeContextType {
  useMockData: boolean;
  setUseMockData: (value: boolean) => void;
}

const DataModeContext = createContext<DataModeContextType | undefined>(undefined);

export function DataModeProvider({ children }: { children: React.ReactNode }) {
  const [useMockData, setUseMockData] = useState(() => {
    // Force real data by default; ignore legacy stored true
    const stored = localStorage.getItem('useMockData');
    return stored !== null ? stored === 'true' : false;
  });
  const { toast } = useToast();

  // One-time migration: if mock mode was previously on, disable and purge cached mock data
  useEffect(() => {
    const stored = localStorage.getItem('useMockData');
    if (stored === 'true') {
      localStorage.setItem('useMockData', 'false');
      setUseMockData(false);
      clearAllCache().then(() => {
        toast({
          title: 'Switched to Real Data',
          description: 'Mock mode disabled and caches cleared to avoid fake data.',
          duration: 3000,
        });
      }).catch(() => {/* ignore */});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('useMockData', String(useMockData));
  }, [useMockData]);

  return (
    <DataModeContext.Provider value={{ useMockData, setUseMockData }}>
      {children}
    </DataModeContext.Provider>
  );
}

export function useDataMode() {
  const context = useContext(DataModeContext);
  if (context === undefined) {
    throw new Error('useDataMode must be used within a DataModeProvider');
  }
  return context;
}
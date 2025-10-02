import React, { createContext, useContext, useState, useEffect } from 'react';

interface DataModeContextType {
  useMockData: boolean;
  setUseMockData: (value: boolean) => void;
}

const DataModeContext = createContext<DataModeContextType | undefined>(undefined);

export function DataModeProvider({ children }: { children: React.ReactNode }) {
  const [useMockData, setUseMockData] = useState(() => {
    // Default to real data (false) since API keys are configured
    const stored = localStorage.getItem('useMockData');
    return stored !== null ? stored === 'true' : false;
  });

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
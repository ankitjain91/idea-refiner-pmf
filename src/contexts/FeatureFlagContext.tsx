import React, { createContext, useContext, useState, useEffect } from 'react';

interface FeatureFlags {
  useOptimizedDataLoading: boolean;
  showCacheIndicators: boolean;
  enableProgressiveLoading: boolean;
}

interface FeatureFlagContextType {
  flags: FeatureFlags;
  setFlag: (key: keyof FeatureFlags, value: boolean) => void;
  toggleFlag: (key: keyof FeatureFlags) => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>({
    useOptimizedDataLoading: true, // Enable by default
    showCacheIndicators: true,
    enableProgressiveLoading: true
  });

  // Load flags from localStorage on mount
  useEffect(() => {
    const savedFlags = localStorage.getItem('featureFlags');
    if (savedFlags) {
      try {
        const parsed = JSON.parse(savedFlags);
        setFlags(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load feature flags:', e);
      }
    }
  }, []);

  // Save flags to localStorage when they change
  useEffect(() => {
    localStorage.setItem('featureFlags', JSON.stringify(flags));
  }, [flags]);

  const setFlag = (key: keyof FeatureFlags, value: boolean) => {
    setFlags(prev => ({ ...prev, [key]: value }));
  };

  const toggleFlag = (key: keyof FeatureFlags) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, setFlag, toggleFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}
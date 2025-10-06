import { useState, useEffect } from 'react';

interface RealTimeDataMode {
  isRealTime: boolean;
  setIsRealTime: (value: boolean) => void;
  refreshInterval: number; // in milliseconds
}

export function useRealTimeDataMode(): RealTimeDataMode {
  const [isRealTime, setIsRealTime] = useState(() => {
    // Default to FALSE (off) to prevent auto-triggering
    const stored = localStorage.getItem('realTimeMode');
    return stored === 'true' ? true : false;
  });

  useEffect(() => {
    localStorage.setItem('realTimeMode', String(isRealTime));
  }, [isRealTime]);

  // Refresh every 2 minutes when in real-time mode (increased from 30s to reduce load)
  const refreshInterval = isRealTime ? 120000 : 0;

  return {
    isRealTime,
    setIsRealTime,
    refreshInterval
  };
}
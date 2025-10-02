import { useState, useEffect } from 'react';

interface RealTimeDataMode {
  isRealTime: boolean;
  setIsRealTime: (value: boolean) => void;
  refreshInterval: number; // in milliseconds
}

export function useRealTimeDataMode(): RealTimeDataMode {
  const [isRealTime, setIsRealTime] = useState(() => {
    const stored = localStorage.getItem('realTimeMode');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('realTimeMode', String(isRealTime));
  }, [isRealTime]);

  // Refresh every 30 seconds when in real-time mode
  const refreshInterval = isRealTime ? 30000 : 0;

  return {
    isRealTime,
    setIsRealTime,
    refreshInterval
  };
}
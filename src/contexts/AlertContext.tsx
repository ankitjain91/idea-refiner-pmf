import React, { createContext, useCallback, useContext, useState } from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AppAlert {
  id: string;
  variant: AlertVariant;
  title?: string;
  message: string;
  createdAt: number;
  autoDismissMs?: number;
  scope?: string; // e.g. auth, session, analysis
}

interface AlertContextType {
  alerts: AppAlert[];
  addAlert: (a: Omit<AppAlert, 'id'|'createdAt'>) => string;
  removeAlert: (id: string) => void;
  clearScope: (scope: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlerts = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlerts must be used within AlertProvider');
  return ctx;
};

const genId = () => Math.random().toString(36).slice(2, 10);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const addAlert: AlertContextType['addAlert'] = useCallback((a) => {
    const id = genId();
    const alert: AppAlert = { id, createdAt: Date.now(), ...a };
    setAlerts(prev => [alert, ...prev].slice(0, 6));
    if (alert.autoDismissMs) {
      setTimeout(() => removeAlert(id), alert.autoDismissMs);
    }
    return id;
  }, [removeAlert]);

  const clearScope = useCallback((scope: string) => {
    setAlerts(prev => prev.filter(a => a.scope !== scope));
  }, []);

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert, clearScope }}>
      {children}
    </AlertContext.Provider>
  );
};

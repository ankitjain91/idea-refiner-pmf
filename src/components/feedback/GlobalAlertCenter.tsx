import React from 'react';
import { useAlerts } from '@/contexts/AlertContext';
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />
};

export const GlobalAlertCenter: React.FC<{ position?: 'top'|'bottom' }>=({ position='top' }) => {
  const { alerts, removeAlert } = useAlerts();
  if (!alerts.length) return null;
  return (
    <div className={cn(
      'pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-3',
      position === 'top' ? 'top-3' : 'bottom-3'
    )}>
      {alerts.map(a => (
        <div
          key={a.id}
          className={cn(
            'pointer-events-auto w-full max-w-xl rounded-lg border shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70 px-4 py-3 flex gap-3 items-start animate-in slide-in-from-top fade-in',
            a.variant === 'success' && 'border-emerald-500/40 bg-emerald-500/10',
            a.variant === 'warning' && 'border-amber-500/40 bg-amber-500/10',
            a.variant === 'info' && 'border-primary/40 bg-primary/10',
            a.variant === 'error' && 'border-destructive/40 bg-destructive/10'
          )}
          role={a.variant === 'error' ? 'alert' : 'status'}
          aria-live={a.variant === 'error' ? 'assertive' : 'polite'}
        >
          <div className="mt-0.5 text-muted-foreground/90">
            {iconMap[a.variant]}
          </div>
          <div className="flex-1 min-w-0">
            {a.title && <p className="text-xs font-semibold mb-0.5 tracking-wide uppercase opacity-80">{a.title}</p>}
            <p className="text-sm leading-snug break-words whitespace-pre-wrap">{a.message}</p>
            {a.scope && <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{a.scope}</p>}
          </div>
          <button
            onClick={() => removeAlert(a.id)}
            className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-foreground/10 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default GlobalAlertCenter;

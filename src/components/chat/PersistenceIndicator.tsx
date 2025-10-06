import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersistenceIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
}

export const PersistenceIndicator: React.FC<PersistenceIndicatorProps> = ({ 
  status, 
  errorMessage,
  onRetry 
}) => {
  if (status === 'idle') {
    return null;
  }

  return (
    <Badge 
      variant={status === 'error' ? 'destructive' : 'secondary'}
      className={cn(
        "gap-1.5 text-xs",
        status === 'saving' && "animate-pulse"
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3" />
          Saved
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-3 w-3" />
          {errorMessage || 'Save failed'}
          {onRetry && (
            <button 
              onClick={onRetry} 
              className="ml-1 underline"
            >
              Retry
            </button>
          )}
        </>
      )}
    </Badge>
  );
};

import React, { useEffect, useState } from 'react';

interface StatusDetail { kind: string; message?: string; phase?: string; }

export const DynamicStatusBar: React.FC = () => {
  const [status, setStatus] = useState<StatusDetail>({ kind: 'idle', message: '' });
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as StatusDetail;
      setStatus(detail);
    };
    window.addEventListener('chat:status', handler as any);
    return () => window.removeEventListener('chat:status', handler as any);
  }, []);

  let text = 'Share your startup idea to begin.';
  if (status.kind === 'brief-suggestions') text = 'Fetching contextual brief answer suggestions...';
  else if (status.kind === 'analysis') {
    const phaseMap: Record<string,string> = {
      validate: 'Validating brief completeness...',
      'fetch-model': 'Generating model insight...',
      structure: 'Structuring analysis output...',
      finalize: 'Finalizing results...'
    };
    text = phaseMap[status.phase || ''] || 'Running analysis...';
  } else if (status.kind === 'refine') text = status.message || 'Refining...';
  else if (status.kind === 'chat') text = status.message || 'Thinking...';

  return <span className='text-muted-foreground hidden sm:inline transition-colors'>{text}</span>;
};

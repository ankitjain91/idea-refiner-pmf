import { useEffect, useRef, useState } from 'react';

interface StatusAnnouncerProps {
  message?: string | null;
}

// Simple polite live region that updates only when message changes.
export const StatusAnnouncer = ({ message }: StatusAnnouncerProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [internal, setInternal] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      if (typeof custom.detail === 'string') {
        setInternal(custom.detail);
        // clear after few seconds to avoid repetition
        setTimeout(() => setInternal(null), 4000);
      }
    };
    window.addEventListener('status:announce', handler as EventListener);
    return () => window.removeEventListener('status:announce', handler as EventListener);
  }, []);

  useEffect(() => {
    const msg = message || internal;
    if (ref.current && msg) {
      ref.current.textContent = msg;
    }
  }, [message, internal]);

  return <div ref={ref} aria-live="polite" aria-atomic="true" className="sr-only" />;
};

export default StatusAnnouncer;

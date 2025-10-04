import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// CRITICAL: Initialize queue wrapper FIRST to ensure ALL function calls go through sequential queue
import { supabase } from '@/lib/supabase-queue-wrapper';
import { installAPIInterceptor } from '@/lib/api-interceptor';
import { globalRequestQueue } from '@/lib/request-queue';
import { warmRouteChunks } from '@/lib/route-prefetch';

// Install API interceptor to track all Supabase function calls
installAPIInterceptor(supabase);

// Soften global request spacing to improve perceived navigation speed
globalRequestQueue.setMinDelay(300);

// Warm up lazy route chunks after idle to speed up first navigation
if (typeof window !== 'undefined') {
  const idle = (cb: () => void) =>
    (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 1200);
  idle(() => warmRouteChunks());
}

createRoot(document.getElementById("root")!).render(<App />);

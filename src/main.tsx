import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// CRITICAL: Initialize queue wrapper FIRST to ensure ALL function calls go through sequential queue
import { supabase } from '@/lib/supabase-queue-wrapper';
import { installAPIInterceptor } from '@/lib/api-interceptor';

// Install API interceptor to track all Supabase function calls
installAPIInterceptor(supabase);

createRoot(document.getElementById("root")!).render(<App />);

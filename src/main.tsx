import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from '@/integrations/supabase/client';
import { installAPIInterceptor } from '@/lib/api-interceptor';

// Install API interceptor to track all Supabase function calls
installAPIInterceptor(supabase);

createRoot(document.getElementById("root")!).render(<App />);

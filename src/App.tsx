import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AuthProvider } from "@/contexts/EnhancedAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarProvider } from "@/components/ui/sidebar";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <SidebarProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Both root and auth routes show the landing page with integrated auth */}
                <Route path="/" element={<AuthPage />} />
                <Route path="/auth" element={<AuthPage />} />
                
                {/* Public route */}
                <Route path="/pricing" element={<Pricing />} />
                
                {/* Protected routes - require authentication */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/subscription-success" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </SidebarProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

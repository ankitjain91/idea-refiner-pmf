import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { user, session, loading, initialized } = useAuth();
  const location = useLocation();

  // Don't show loading state if we have cached auth data
  if (!initialized && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Loading session...</p>
        </div>
      </div>
    );
  }

  // If authentication is required and user is not authenticated
  if (requireAuth && !user && initialized) {
    console.log("ProtectedRoute redirecting to / with auth modal:", { initialized, loading, hasUser: !!user, path: location.pathname });
    // Redirect to landing page and open auth modal, preserving original location
    return <Navigate to="/" state={{ from: location, openAuthModal: true }} replace />;
  }

  return <>{children}</>;
};
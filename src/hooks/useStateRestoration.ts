import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';

// Hook to restore and persist application state on browser refresh
export const useStateRestoration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Save current path to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('lastPath', location.pathname);
    sessionStorage.setItem('lastSearch', location.search);
    sessionStorage.setItem('lastHash', location.hash);
  }, [location]);

  // Restore path on initial load
  useEffect(() => {
    // Only run restoration once on mount
    const hasRestored = sessionStorage.getItem('hasRestored');
    
    if (!loading && !hasRestored) {
      sessionStorage.setItem('hasRestored', 'true');
      
      const lastPath = sessionStorage.getItem('lastPath');
      const lastSearch = sessionStorage.getItem('lastSearch') || '';
      const lastHash = sessionStorage.getItem('lastHash') || '';
      
      // Only restore if we're on the root path and have a saved path that's not root
      if (location.pathname === '/' && lastPath && lastPath !== '/' && lastPath !== '/auth') {
        // Check if the path requires authentication
        const protectedPaths = ['/dashboard', '/settings', '/subscription-success'];
        const isProtectedPath = protectedPaths.some(path => lastPath.startsWith(path));
        
        if (isProtectedPath && !user) {
          // If it's a protected path and user is not authenticated, clear the restoration
          sessionStorage.removeItem('lastPath');
          sessionStorage.removeItem('lastSearch');
          sessionStorage.removeItem('lastHash');
        } else if (user || !isProtectedPath) {
          // Only navigate if user is authenticated for protected paths, or it's a public path
          navigate(`${lastPath}${lastSearch}${lastHash}`, { replace: true });
        }
      }
    }
  }, [loading, user, navigate]);
  
  // Clear restoration flag on unmount
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('hasRestored');
    };
  }, []);

  // Save form data and UI state
  useEffect(() => {
    const saveFormData = () => {
      const forms = document.querySelectorAll('form');
      const formData: Record<string, any> = {};
      
      forms.forEach((form, index) => {
        const formId = form.id || `form-${index}`;
        const inputs = form.querySelectorAll('input, textarea, select');
        const inputData: Record<string, any> = {};
        
        inputs.forEach((input: any) => {
          if (input.type !== 'password' && input.type !== 'file') {
            const key = input.name || input.id || `input-${Array.from(inputs).indexOf(input)}`;
            if (input.type === 'checkbox' || input.type === 'radio') {
              inputData[key] = input.checked;
            } else {
              inputData[key] = input.value;
            }
          }
        });
        
        if (Object.keys(inputData).length > 0) {
          formData[formId] = inputData;
        }
      });
      
      if (Object.keys(formData).length > 0) {
        sessionStorage.setItem('formData', JSON.stringify(formData));
      }

      // Save scroll position
      sessionStorage.setItem('scrollPosition', String(window.scrollY));
    };

    // Save data on various events
    const events = ['beforeunload', 'pagehide'];
    events.forEach(event => {
      window.addEventListener(event, saveFormData);
    });

    // Also save on input changes
    const handleInput = () => {
      saveFormData();
    };
    document.addEventListener('input', handleInput);
    document.addEventListener('change', handleInput);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, saveFormData);
      });
      document.removeEventListener('input', handleInput);
      document.removeEventListener('change', handleInput);
    };
  }, []);

  // Restore form data and scroll position
  useEffect(() => {
    const restoreFormData = () => {
      const savedFormData = sessionStorage.getItem('formData');
      if (savedFormData) {
        try {
          const formData = JSON.parse(savedFormData);
          
          // Wait for forms to be rendered
          setTimeout(() => {
            Object.entries(formData).forEach(([formId, inputData]) => {
              const form = document.getElementById(formId) || document.querySelector(`form:nth-of-type(${parseInt(formId.replace('form-', '')) + 1})`);
              if (form && inputData) {
                Object.entries(inputData as Record<string, any>).forEach(([inputKey, value]) => {
                  const input = form.querySelector(`[name="${inputKey}"], [id="${inputKey}"]`) as any;
                  if (input) {
                    if (input.type === 'checkbox' || input.type === 'radio') {
                      input.checked = value;
                    } else {
                      input.value = value;
                    }
                    // Trigger change event to update React state
                    const event = new Event('change', { bubbles: true });
                    input.dispatchEvent(event);
                  }
                });
              }
            });
          }, 100);
        } catch (error) {
          console.error('Error restoring form data:', error);
        }
      }

      // Restore scroll position
      const scrollPosition = sessionStorage.getItem('scrollPosition');
      if (scrollPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(scrollPosition));
        }, 200);
      }
    };

    restoreFormData();
  }, [location.pathname]);

  // Save application state to localStorage
  useEffect(() => {
    const saveAppState = () => {
      const appState = {
        timestamp: new Date().toISOString(),
        path: location.pathname,
        search: location.search,
        hash: location.hash,
        // Add any other global state that needs to be persisted
      };
      localStorage.setItem('appState', JSON.stringify(appState));
    };

    saveAppState();
    
    // Save on visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveAppState();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location]);

  return {
    isRestoring: loading,
  };
};

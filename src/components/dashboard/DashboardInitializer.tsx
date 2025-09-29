import { useEffect, useState } from 'react';
import { clearAllDashboardData } from '@/utils/clearDashboardData';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function DashboardInitializer() {
  const [isClearing, setIsClearing] = useState(false);
  const [hasCleared, setHasCleared] = useState(() => {
    // Check if we've already cleared the data
    return localStorage.getItem('dashboard_data_cleared_v1') === 'true';
  });

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      const success = await clearAllDashboardData();
      if (success) {
        toast.success('Dashboard data cleared successfully');
        localStorage.setItem('dashboard_data_cleared_v1', 'true');
        setHasCleared(true);
        // Reload to fetch fresh data
        window.location.reload();
      } else {
        toast.error('Failed to clear dashboard data');
      }
    } catch (error) {
      toast.error('Error clearing dashboard data');
      console.error(error);
    } finally {
      setIsClearing(false);
    }
  };

  // Auto-clear on first load if not already done
  useEffect(() => {
    if (!hasCleared) {
      console.log('First time dashboard load - clearing old mock data...');
      handleClearData();
    }
  }, []);

  // Development mode: Show manual clear button
  if (process.env.NODE_ENV === 'development' && hasCleared) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearData}
          disabled={isClearing}
          className="shadow-lg"
        >
          {isClearing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Clearing...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear DB Data
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}
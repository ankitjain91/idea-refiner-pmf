// Dashboard component - DISABLED
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { Card } from '@/components/ui/card';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { state: { from: { pathname: '/dashboard' }, openAuthModal: true } });
    }
  }, [user, authLoading, navigate]);

  // Dashboard is temporarily disabled
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Dashboard Temporarily Disabled</h2>
        <p className="text-muted-foreground mb-4">
          The dashboard is currently disabled to prevent API requests.
        </p>
        <button 
          onClick={() => navigate('/ideachat')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Go to Idea Chat
        </button>
      </Card>
    </div>
  );
};

export default Dashboard;
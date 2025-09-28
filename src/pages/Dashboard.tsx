import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import ValidationHub from '@/pages/ValidationHub';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { state: { from: { pathname: '/dashboard' }, openAuthModal: true } });
    }
  }, [user, authLoading, navigate]);

  // Render the ValidationHub directly
  return <ValidationHub />;
};

export default Dashboard;
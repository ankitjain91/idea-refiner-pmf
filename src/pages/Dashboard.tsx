// Dashboard component - renders EnterpriseHub
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import EnterpriseHub from '@/pages/EnterpriseHub';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { state: { from: { pathname: '/dashboard' }, openAuthModal: true } });
    }
  }, [user, authLoading, navigate]);

  // Render the EnterpriseHub directly
  return <EnterpriseHub />;
};

export default Dashboard;
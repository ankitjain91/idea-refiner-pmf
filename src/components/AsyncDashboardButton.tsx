import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';

export const AsyncDashboardButton = () => {
  const navigate = useNavigate();
  const [hasIdea, setHasIdea] = useState(false);

  useEffect(() => {
    const checkIdea = () => {
      const currentIdea = localStorage.getItem('currentIdea');
      setHasIdea(!!currentIdea);
    };

    checkIdea();

    // Listen for storage changes
    window.addEventListener('storage', checkIdea);
    // Listen for custom events when idea is set/cleared
    window.addEventListener('idea:changed', checkIdea);

    return () => {
      window.removeEventListener('storage', checkIdea);
      window.removeEventListener('idea:changed', checkIdea);
    };
  }, []);

  const handleClick = () => {
    navigate('/dashboard');
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      disabled={!hasIdea}
      className="hover:border-primary/50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <LayoutDashboard className="h-4 w-4 mr-2" />
      <span>Dashboard</span>
    </Button>
  );
};

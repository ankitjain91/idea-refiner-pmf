import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard } from 'lucide-react';
import { useIdeaContext } from '@/hooks/useIdeaContext';

export const AsyncDashboardButton = () => {
  const navigate = useNavigate();
  const { hasIdea } = useIdeaContext();

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

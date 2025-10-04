import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard } from 'lucide-react';

export const AsyncDashboardButton = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/dashboard');
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      className="hover:border-primary/50 hover:shadow-md"
    >
      <LayoutDashboard className="h-4 w-4 mr-2" />
      <span>Dashboard</span>
    </Button>
  );
};

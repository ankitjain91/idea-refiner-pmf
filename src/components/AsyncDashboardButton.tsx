import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Lock } from 'lucide-react';
import { useLockedIdea } from '@/lib/lockedIdeaManager';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const AsyncDashboardButton = () => {
  const navigate = useNavigate();
  const { hasLockedIdea } = useLockedIdea();

  const handleClick = () => {
    navigate('/dashboard');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            variant="outline"
            size="sm"
            disabled={!hasLockedIdea}
            className="hover:border-primary/50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hasLockedIdea ? (
              <LayoutDashboard className="h-4 w-4 mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2 opacity-50" />
            )}
            <span>View Analysis Dashboard</span>
          </Button>
        </TooltipTrigger>
        {!hasLockedIdea && (
          <TooltipContent>
            <p className="text-sm">Lock in your idea first to unlock the dashboard</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

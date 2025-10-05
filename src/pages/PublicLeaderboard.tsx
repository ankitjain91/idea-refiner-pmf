import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Brain, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import IdeasLeaderboard from '@/components/social/IdeasLeaderboard';

export default function PublicLeaderboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-foreground" />
              <span className="font-semibold text-base">SmoothBrains</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/')}
                className="rounded-full"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Leaderboard Content */}
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <IdeasLeaderboard />
      </div>
    </div>
  );
}

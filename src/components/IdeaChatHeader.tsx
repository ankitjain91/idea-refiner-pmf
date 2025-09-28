import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lightbulb, Sparkles, List, FileText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from '@/components/UserMenu';
import { DynamicStatusBar } from '@/pages/DynamicStatusBar';
import { OpenAIBilling } from '@/components/OpenAIBilling';
import { cn } from '@/lib/utils';
import type { ResponseMode } from '@/hooks/useIdeaChatState';

interface IdeaChatHeaderProps {
  currentSession: any;
  saving: boolean;
  sessionReloading: boolean;
  responseMode: ResponseMode;
  onToggleResponseMode: () => void;
}

export function IdeaChatHeader({
  currentSession,
  saving,
  sessionReloading,
  responseMode,
  onToggleResponseMode
}: IdeaChatHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col gap-1 px-6 py-3 border-b glass-super-surface sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1
              className={cn('text-lg font-semibold flex items-center gap-3', sessionReloading && 'opacity-70')}
            >
              <span className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-400" />
                {location.pathname !== '/ideachat' ? (
                  <button 
                    onClick={() => navigate('/ideachat')}
                    className="hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline"
                    title="Go back to chat"
                  >
                    {currentSession?.name || 'Idea Chat'}
                  </button>
                ) : (
                  <span>{currentSession?.name || 'Idea Chat'}</span>
                )}
                
                {/* Response Mode Indicator */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant={responseMode === 'summary' ? 'default' : 'secondary'}
                        className="ml-2 flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={onToggleResponseMode}
                      >
                        {responseMode === 'summary' ? (
                          <>
                            <List className="h-3 w-3" />
                            <span className="text-[10px] font-medium">Summary</span>
                          </>
                        ) : (
                          <>
                            <FileText className="h-3 w-3" />
                            <span className="text-[10px] font-medium">Detailed</span>
                          </>
                        )}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {responseMode === 'summary' 
                          ? 'Click for detailed responses' 
                          : 'Click for concise summaries'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {currentSession && saving && (
                  <span className='ml-2 inline-flex items-center gap-1 text-[10px] tracking-wide text-muted-foreground'>
                    <Loader2 className='h-3 w-3 animate-spin' /> Saving…
                  </span>
                )}
              </span>
              {sessionReloading && <Loader2 className='h-4 w-4 animate-spin text-primary' />}
            </h1>
            <p className='text-xs text-muted-foreground'>Refine · Analyze · Iterate</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <OpenAIBilling />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
      {/* Idea focus utility bar */}
      <div className="flex items-center gap-3 text-[11px] flex-wrap">
        <Button
          size="sm"
          variant="default"
          className="h-8 px-3 text-[11px] gap-1.5 font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => window.dispatchEvent(new CustomEvent('analysis:openBrief'))}
          title="Run comprehensive PMF analysis"
        >
          <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
          <span className="hidden sm:inline">Start Analysis</span>
          <span className="sm:hidden">Analyze</span>
        </Button>
        <DynamicStatusBar />
      </div>
    </div>
  );
}
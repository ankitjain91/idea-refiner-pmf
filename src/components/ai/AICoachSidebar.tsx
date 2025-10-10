import { useState } from 'react';
import { usePMF } from '@/hooks/usePMF';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, Target, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AICoachSidebarProps {
  ideaId: string;
}

export function AICoachSidebar({ ideaId }: AICoachSidebarProps) {
  const { currentScore, actions, loading, updateActionStatus } = usePMF(ideaId);
  const { toast } = useToast();
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleActionComplete = async (actionId: string) => {
    setProcessingAction(actionId);
    const success = await updateActionStatus(actionId, 'completed');
    setProcessingAction(null);
    
    if (success) {
      toast({
        title: '✅ Action Completed',
        description: 'Great progress! Keep building momentum.',
      });
    }
  };

  const topActions = actions
    .filter(a => a.status === 'pending')
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  return (
    <div className="w-80 border-l bg-muted/30 p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            AI Coach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading insights...</p>
          ) : (
            <>
              {currentScore && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">PMF Score</span>
                    <Badge variant={currentScore.pmf_score >= 70 ? 'default' : 'secondary'}>
                      {currentScore.pmf_score}/100
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentScore.pmf_score >= 70 
                      ? '🎉 Strong product-market fit potential!' 
                      : currentScore.pmf_score >= 40
                      ? '💪 Good foundation, keep iterating'
                      : '🔧 Needs refinement - focus on key weaknesses'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Top 3 Next Steps
                </h4>
                {topActions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending actions</p>
                ) : (
                  <div className="space-y-2">
                    {topActions.map((action) => (
                      <div key={action.id} className="p-2 rounded-lg border bg-background space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium leading-tight">{action.title}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {action.estimated_effort}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {action.description}
                        </p>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="w-full text-xs h-7"
                          onClick={() => handleActionComplete(action.id)}
                          disabled={processingAction === action.id}
                        >
                          {processingAction === action.id ? (
                            <>
                              <Clock className="h-3 w-3 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Mark Complete
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {currentScore?.score_breakdown && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Score Breakdown
                  </h4>
                  <div className="space-y-1">
                    {Object.entries(currentScore.score_breakdown).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-medium">{value}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

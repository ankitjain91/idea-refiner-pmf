import { useState, useEffect } from 'react';
import { useLockedIdea } from '@/hooks/useLockedIdea';
import { usePMF } from '@/hooks/usePMF';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, RefreshCw } from 'lucide-react';
import { PMFScoreCard } from '@/components/ai/PMFScoreCard';
import { ActionsPanel } from '@/components/ai/ActionsPanel';
import { LiveContextCard } from '@/components/ai/LiveContextCard';
import { AICoachSidebar } from '@/components/ai/AICoachSidebar';
import { ScoreHistoryChart } from '@/components/ai/ScoreHistoryChart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AIInsights() {
  const { idea, lockedIdea, hasIdea } = useLockedIdea();
  const [ideaId, setIdeaId] = useState<string>('');
  const { currentScore, scoreHistory, actions, loading, computePMF } = usePMF(ideaId);
  const { toast } = useToast();
  const [calculating, setCalculating] = useState(false);

  // Fetch or create idea ID for the locked/current idea
  useEffect(() => {
    const fetchIdeaId = async () => {
      if (!idea) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find existing idea
        const { data: existingIdea, error } = await supabase
          .from('ideas')
          .select('id')
          .eq('user_id', user.id)
          .eq('original_idea', idea)
          .maybeSingle();

        if (error) {
          console.error('Error fetching idea:', error);
          return;
        }

        if (existingIdea) {
          setIdeaId(existingIdea.id);
        } else {
          // Create new idea
          const { data: newIdea, error: insertError } = await supabase
            .from('ideas')
            .insert({
              user_id: user.id,
              original_idea: idea,
              refined_idea: idea
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('Error creating idea:', insertError);
            return;
          }

          if (newIdea) {
            setIdeaId(newIdea.id);
          }
        }
      } catch (error) {
        console.error('Error in fetchIdeaId:', error);
      }
    };

    fetchIdeaId();
  }, [idea]);

  const handleCalculatePMF = async () => {
    if (!ideaId) {
      toast({
        title: 'No Idea Selected',
        description: 'Please select an idea from Idea Chat first.',
        variant: 'destructive'
      });
      return;
    }

    setCalculating(true);
    try {
      await computePMF(ideaId, true);
      toast({
        title: '✨ PMF Score Calculated',
        description: 'Your AI insights have been updated.',
      });
    } catch (error) {
      console.error('PMF calculation error:', error);
    } finally {
      setCalculating(false);
    }
  };

  if (!hasIdea) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Idea Selected</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              To view AI insights, please select and lock an idea from the Idea Chat page.
            </p>
            <Button variant="default" onClick={() => window.location.href = '/ideachat'}>
              Go to Idea Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary" />
                AI Insights & Analytics
              </h1>
              <p className="text-muted-foreground">
                Comprehensive AI-powered analysis for: <span className="font-medium text-foreground">{idea}</span>
              </p>
            </div>
            <Button 
              onClick={handleCalculatePMF} 
              disabled={calculating || loading}
              size="lg"
            >
              {calculating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Calculate PMF Score
                </>
              )}
            </Button>
          </div>

          {/* PMF Score Card */}
          <PMFScoreCard 
            currentScore={currentScore} 
            loading={loading}
            onRecalculate={handleCalculatePMF}
          />

          {/* Score History Chart */}
          {scoreHistory && scoreHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Score Trends</CardTitle>
                <CardDescription>Track your PMF score evolution over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ScoreHistoryChart history={scoreHistory} />
              </CardContent>
            </Card>
          )}

          {/* Live Market Context */}
          {ideaId && (
            <LiveContextCard ideaId={ideaId} />
          )}

          {/* Actions Panel */}
          <ActionsPanel 
            actions={actions} 
            loading={loading}
            ideaId={ideaId}
          />
        </div>
      </div>

      {/* AI Coach Sidebar */}
      {ideaId && (
        <AICoachSidebar ideaId={ideaId} />
      )}
    </div>
  );
}

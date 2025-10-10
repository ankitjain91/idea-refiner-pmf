/**
 * SmoothBrains AI Assistant - Integration Examples
 * 
 * This file shows how to integrate the AI Coach, Live Context, and PMF scoring
 * into your existing pages.
 */

import { useState } from 'react';
import { AICoachSidebar } from '@/components/ai/AICoachSidebar';
import { LiveContextCard } from '@/components/ai/LiveContextCard';
import { usePMF } from '@/hooks/usePMF';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// Example 1: Adding AI Coach to Idea View
// ============================================

export function IdeaViewWithCoach({ ideaId }: { ideaId: string }) {
  return (
    <div className="flex min-h-screen">
      {/* Main content */}
      <div className="flex-1 p-6">
        <h1>Your Idea Analysis</h1>
        {/* Your existing idea content */}
      </div>

      {/* AI Coach Sidebar */}
      <AICoachSidebar ideaId={ideaId} />
    </div>
  );
}

// ============================================
// Example 2: Computing PMF Score
// ============================================

export function ComputePMFButton({ ideaId }: { ideaId: string }) {
  const { computePMF, loading, currentScore } = usePMF(ideaId);
  const { toast } = useToast();

  const handleComputePMF = async () => {
    const score = await computePMF(ideaId);
    if (score) {
      toast({
        title: 'PMF Score Calculated',
        description: `Your idea scored ${score.pmf_score}/100`,
      });
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleComputePMF} disabled={loading}>
        {loading ? 'Computing...' : 'Calculate PMF Score'}
      </Button>

      {currentScore && (
        <div className="p-4 border rounded-lg">
          <h3 className="font-bold">PMF Score: {currentScore.pmf_score}/100</h3>
          <p className="text-sm text-muted-foreground">
            Confidence: {(currentScore.ai_confidence * 100).toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Example 3: Dashboard with Live Context
// ============================================

export function DashboardWithLiveContext({ ideaId }: { ideaId: string }) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Idea Dashboard</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Your main dashboard tiles */}
          <div className="grid gap-4">
            {/* Market Size, Competition, etc. */}
          </div>
        </div>

        <div className="space-y-4">
          {/* Live Market Context Card */}
          <LiveContextCard ideaId={ideaId} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Example 4: Generate Pitch Deck
// ============================================

export function GeneratePitchDeckButton({ ideaId, userId }: { ideaId: string; userId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGenerateDeck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pitch-deck', {
        body: { idea_id: ideaId, user_id: userId },
      });

      if (error) throw error;

      // Download or display the pitch deck
      console.log('Generated pitch deck:', data.pitch_deck);

      toast({
        title: 'Pitch Deck Generated',
        description: `Created ${data.pitch_deck.slides.length} slides`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleGenerateDeck} disabled={loading}>
      {loading ? 'Generating...' : 'Generate Pitch Deck'}
    </Button>
  );
}

// ============================================
// Example 5: Team Digest Integration
// ============================================

export function SendTeamDigest({ webhookUrl }: { webhookUrl: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const sendDigest = async (period: 'daily' | 'weekly' | 'monthly') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('slack-team-digest', {
        body: { webhook_url: webhookUrl, period },
      });

      if (error) throw error;

      toast({
        title: 'Digest Sent',
        description: `${period} digest sent to Slack successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-x-2">
      <Button onClick={() => sendDigest('daily')} disabled={loading} size="sm">
        Daily Digest
      </Button>
      <Button onClick={() => sendDigest('weekly')} disabled={loading} size="sm">
        Weekly Digest
      </Button>
      <Button onClick={() => sendDigest('monthly')} disabled={loading} size="sm">
        Monthly Digest
      </Button>
    </div>
  );
}

// ============================================
// Example 6: Using Actions from usePMF
// ============================================

export function NextStepsPanel({ ideaId }: { ideaId: string }) {
  const { actions, updateActionStatus } = usePMF(ideaId);

  const pendingActions = actions.filter(a => a.status === 'pending');

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Next Steps</h3>
      {pendingActions.map(action => (
        <div key={action.id} className="p-3 border rounded-lg space-y-2">
          <h4 className="font-medium">{action.title}</h4>
          <p className="text-sm text-muted-foreground">{action.description}</p>
          <Button
            size="sm"
            onClick={() => updateActionStatus(action.id, 'completed')}
          >
            Mark Complete
          </Button>
        </div>
      ))}
    </div>
  );
}

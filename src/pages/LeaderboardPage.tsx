import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, ThumbsUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('is_public', true)
        .order('pmf_score', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error: any) {
      console.error('Error loading leaderboard:', error);
      toast({
        title: 'Error',
        description: 'Could not load leaderboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (ideaId: string) => {
    try {
      const idea = leaderboard.find(i => i.id === ideaId);
      if (!idea) return;

      const { error } = await supabase
        .from('leaderboard')
        .update({ upvotes: idea.upvotes + 1 })
        .eq('id', ideaId);

      if (error) throw error;

      setLeaderboard(prev =>
        prev.map(item =>
          item.id === ideaId ? { ...item, upvotes: item.upvotes + 1 } : item
        )
      );

      toast({
        title: '👍 Upvoted!',
        description: 'Great idea!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
            <Trophy className="h-10 w-10 text-primary" />
            Idea Leaderboard
          </h1>
          <p className="text-muted-foreground">
            Top-rated ideas ranked by PMF score and community votes
          </p>
        </div>

        <div className="grid gap-4">
          {leaderboard.map((item, index) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {item.idea_text}
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <Badge variant="default" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          PMF: {item.pmf_score}/100
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpvote(item.id)}
                          className="gap-1"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {item.upvotes}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}

          {leaderboard.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No ideas on the leaderboard yet. Be the first!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

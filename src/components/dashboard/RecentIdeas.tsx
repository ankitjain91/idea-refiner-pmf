import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Plus, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { formatDistanceToNow } from "date-fns";

interface IdeaItem {
  id: string;
  original_idea: string;
  pmf_score: number;
  updated_at: string;
}

export function RecentIdeas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchIdeas = async () => {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .select('id, idea, pmf_score, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (data && !error) {
        setIdeas(data.map(d => ({
          id: d.id,
          original_idea: d.idea,
          pmf_score: d.pmf_score || 0,
          updated_at: d.updated_at
        })));
      }
      setLoading(false);
    };

    fetchIdeas();
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Your Ideas
            </CardTitle>
            <CardDescription>Recently validated ideas</CardDescription>
          </div>
          <Button onClick={() => navigate('/ideachat')} className="gap-2">
            <Plus className="h-4 w-4" />
            Validate New Idea
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading ideas...</div>
        ) : ideas.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No ideas yet. Start validating!</p>
            <Button onClick={() => navigate('/ideachat')} variant="outline">
              Create Your First Idea
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/40 hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/ideachat?session=${idea.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{idea.original_idea}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated {formatDistanceToNow(new Date(idea.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={idea.pmf_score >= 70 ? 'default' : 'secondary'} className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {idea.pmf_score}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

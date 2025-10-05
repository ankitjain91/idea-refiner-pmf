import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { formatDistanceToNow } from "date-fns";

interface SessionItem {
  id: string;
  name: string;
  state: any;
  updated_at: string;
  last_accessed: string | null;
}

export function RecentIdeas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .select('id, name, state, updated_at, last_accessed')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_accessed', { ascending: false, nullsFirst: false })
        .limit(3);

      if (data && !error) {
        setSessions(data);
      }
      setLoading(false);
    };

    fetchSessions();
  }, [user]);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Your Sessions
            </CardTitle>
            <CardDescription>Recently active idea validation sessions</CardDescription>
          </div>
          <Button onClick={() => navigate('/ideachat')} className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">No sessions yet</p>
              <p className="text-xs text-muted-foreground mb-4">Start your first idea validation session</p>
            </div>
            <Button onClick={() => navigate('/ideachat')} variant="outline">
              Start First Session
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="group flex items-start justify-between gap-4 p-4 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-accent/5 transition-all cursor-pointer"
                onClick={() => navigate(`/ideachat?session=${session.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                    <h4 className="font-medium text-sm truncate">{session.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {session.state?.currentIdea || 'No idea yet'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(session.last_accessed || session.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {session.state?.pmfScore > 0 && (
                    <Badge variant={session.state.pmfScore >= 70 ? 'default' : 'secondary'} className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {session.state.pmfScore}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

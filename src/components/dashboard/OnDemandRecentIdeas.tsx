import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { formatDistanceToNow } from "date-fns";
import { OnDemandTile } from "@/components/ui/OnDemandTile";

interface SessionItem {
  id: string;
  name: string;
  state: any;
  updated_at: string;
  last_accessed: string | null;
}

export function OnDemandRecentIdeas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchSessions = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('brainstorming_sessions')
        .select('id, name, state, updated_at, last_accessed')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_accessed', { ascending: false, nullsFirst: false })
        .limit(5);

      if (fetchError) throw fetchError;

      setSessions(data || []);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recent ideas');
    } finally {
      setLoading(false);
    }
  };

  const renderSessionsContent = () => {
    if (!hasLoaded) return null;

    if (sessions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="p-4 bg-muted/20 rounded-full">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">No recent ideas yet</p>
            <p className="text-xs text-muted-foreground mb-4">Start brainstorming to see your ideas here</p>
            <Button 
              onClick={() => navigate('/chat')}
              size="sm"
              className="bg-gradient-to-r from-primary to-accent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start New Idea
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Sessions List */}
        <div className="space-y-3">
          {sessions.map((session) => {
            const lastAccessed = session.last_accessed || session.updated_at;
            const timeAgo = formatDistanceToNow(new Date(lastAccessed), { addSuffix: true });
            const hasRecentActivity = new Date(lastAccessed) > new Date(Date.now() - 24*60*60*1000);

            return (
              <div 
                key={session.id}
                className="group p-4 bg-gradient-to-r from-card to-card/80 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-200 cursor-pointer"
                onClick={() => navigate(`/chat?session=${session.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{session.name}</h3>
                      {hasRecentActivity && (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{timeAgo}</span>
                    </div>
                    {session.state?.currentIdea && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {session.state.currentIdea.slice(0, 100)}...
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/chat')}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Idea
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/sessions')}
            className="flex-1"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-muted/20 rounded-lg text-center">
            <div className="text-lg font-bold text-primary">{sessions.length}</div>
            <div className="text-xs text-muted-foreground">Active Ideas</div>
          </div>
          <div className="p-3 bg-muted/20 rounded-lg text-center">
            <div className="text-lg font-bold text-accent">
              {sessions.filter(s => new Date(s.last_accessed || s.updated_at) > new Date(Date.now() - 7*24*60*60*1000)).length}
            </div>
            <div className="text-xs text-muted-foreground">This Week</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <OnDemandTile
      title="Recent Ideas"
      icon={MessageSquare}
      description="View and access your most recent brainstorming sessions and idea development work."
      features={[
        "Recent brainstorming sessions with activity status",
        "Quick access to continue working on ideas",
        "Session metadata including last accessed time",
        "Activity statistics and engagement metrics",
        "Easy navigation to create new ideas"
      ]}
      estimatedLoadTime="~3 seconds"
      isLoading={loading}
      error={error}
      data={hasLoaded ? sessions : null}
      onLoad={fetchSessions}
      onRefresh={fetchSessions}
      className="border-primary/20"
      badge={{
        text: sessions.length > 0 ? `${sessions.length} Ideas` : "Ready",
        variant: sessions.length > 0 ? "default" : "outline"
      }}
    >
      {renderSessionsContent()}
    </OnDemandTile>
  );
}
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, ArrowRight, Sparkles, Eye, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PaywallOverlay from "@/components/PaywallOverlay";

interface SimilarIdea {
  id: string;
  original_idea: string;
  pmf_score: number;
  category: string;
  keywords: string[];
  user_id: string;
  profiles?: {
    email: string;
    display_name: string;
  };
}

interface CollaborationHubProps {
  currentIdea: string;
  currentCategory?: string;
  currentKeywords?: string[];
  userId: string;
}

export default function CollaborationHub({ 
  currentIdea, 
  currentCategory, 
  currentKeywords = [], 
  userId 
}: CollaborationHubProps) {
  const [similarIdeas, setSimilarIdeas] = useState<SimilarIdea[]>([]);
  const [activeUsers, setActiveUsers] = useState<{[key: string]: any}>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!currentIdea) return;
    
    // Set up real-time presence
    const channel = supabase.channel('idea-presence');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setActiveUsers(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            idea_category: currentCategory,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Load similar ideas
    loadSimilarIdeas();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentIdea, currentCategory, userId]);

  const loadSimilarIdeas = async () => {
    setLoading(true);
    
    // Query for similar ideas based on category or keywords
    let query = supabase
      .from('ideas')
      .select(`
        id,
        original_idea,
        pmf_score,
        category,
        keywords,
        user_id
      `)
      .eq('is_public', true)
      .neq('user_id', userId);

    if (currentCategory) {
      query = query.eq('category', currentCategory);
    }

    const { data, error } = await query.limit(5);

    if (error) {
      console.error('Error loading similar ideas:', error);
      setSimilarIdeas([]);
    } else if (data) {
      // Load profiles separately for each idea
      const ideasWithProfiles = await Promise.all(
        data.map(async (idea) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, display_name')
            .eq('user_id', idea.user_id)
            .maybeSingle();
          
          return {
            ...idea,
            profiles: profileData
          } as SimilarIdea;
        })
      );
      setSimilarIdeas(ideasWithProfiles);
    }
    setLoading(false);
  };

  const handleConnect = async (targetIdeaId: string, targetUserId: string) => {
    const { error } = await supabase
      .from('collaborations')
      .insert({
        idea_id: targetIdeaId,
        requester_id: userId,
        recipient_id: targetUserId,
        message: `I'm interested in collaborating on your idea!`,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send connection request",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Request Sent",
        description: "Your collaboration request has been sent!",
      });
    }
  };

  const getActiveUserCount = () => {
    return Object.keys(activeUsers).length;
  };

  return (
    <Card className="border-border/50 bg-card/95 backdrop-blur-xl animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Collaboration Hub
            </CardTitle>
            <CardDescription>
              Connect with others working on similar ideas
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {getActiveUserCount()} Active Now
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Users Indicator */}
        {getActiveUserCount() > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              {getActiveUserCount()} {getActiveUserCount() === 1 ? 'person is' : 'people are'} exploring similar ideas right now
            </p>
          </div>
        )}

        {/* Similar Ideas List */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Finding similar ideas...
            </p>
          ) : similarIdeas.length > 0 ? (
            similarIdeas.map((idea) => (
              <div
                key={idea.id}
                className="p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all hover:shadow-sm bg-background/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {idea.profiles?.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        {idea.profiles?.display_name || idea.profiles?.email?.split('@')[0] || 'Anonymous'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        PMF: {idea.pmf_score}%
                      </Badge>
                    </div>
                    <p className="text-sm line-clamp-2">{idea.original_idea}</p>
                    {idea.keywords && idea.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {idea.keywords.slice(0, 3).map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConnect(idea.id, idea.user_id)}
                    className="flex items-center gap-1"
                  >
                    Connect
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No similar public ideas found yet. Be the first to share!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Mail, Sparkles, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface UserExploringIdea {
  id: string;
  email: string;
  original_idea: string;
  refined_idea?: string;
  pmf_score: number;
  category?: string;
  keywords?: string[];
  created_at: string;
}

interface SimilarUsersExplorerProps {
  currentCategory?: string;
  currentKeywords?: string[];
  currentUserId?: string;
}

export default function SimilarUsersExplorer({ 
  currentCategory, 
  currentKeywords = [],
  currentUserId
}: SimilarUsersExplorerProps) {
  const [usersWithSimilarIdeas, setUsersWithSimilarIdeas] = useState<UserExploringIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtimeUsers, setRealtimeUsers] = useState<{[key: string]: any}>({});

  useEffect(() => {
    // Set up real-time presence channel
    const channel = supabase.channel('similar-ideas-explorer');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setRealtimeUsers(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined exploration:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left exploration:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUserId) {
          await channel.track({
            user_id: currentUserId,
            exploring_category: currentCategory,
            timestamp: new Date().toISOString(),
          });
        }
      });

    // Load users with similar ideas
    loadSimilarUsers();

    // Listen for real-time updates on ideas table
    const ideasChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ideas'
        },
        () => {
          loadSimilarUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(ideasChannel);
    };
  }, [currentCategory, currentKeywords, currentUserId]);

  const loadSimilarUsers = async () => {
    setLoading(true);
    
    try {
      // Query for public ideas with user emails
      let query = supabase
        .from('ideas')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (currentCategory) {
        query = query.eq('category', currentCategory);
      }

      // Exclude current user if provided
      if (currentUserId) {
        query = query.neq('user_id', currentUserId);
      }

      const { data: ideasData, error: ideasError } = await query.limit(10);

      if (ideasError) {
        console.error('Error loading ideas:', ideasError);
        setUsersWithSimilarIdeas([]);
        return;
      }

      if (ideasData && ideasData.length > 0) {
        // Get user emails from auth.users
        const userIds = [...new Set(ideasData.map(idea => idea.user_id))];
        
        // Fetch user data for each idea
        const usersWithIdeas = await Promise.all(
          ideasData.map(async (idea) => {
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
              idea.user_id
            ).catch(() => ({ data: null, error: 'Cannot fetch user' }));

            // Fallback to using RPC function or direct query if admin API not available
            const { data: sessionData } = await supabase.auth.getSession();
            let userEmail = 'user@example.com'; // Default fallback
            
            // Try to get email from current session if it's the same user
            if (sessionData?.session?.user?.id === idea.user_id) {
              userEmail = sessionData.session.user.email || userEmail;
            } else {
              // For other users, we need to show placeholder or implement proper lookup
              userEmail = `user_${idea.user_id.substring(0, 8)}@platform.com`;
            }

            return {
              id: idea.id,
              email: userEmail,
              original_idea: idea.original_idea,
              refined_idea: idea.refined_idea,
              pmf_score: idea.pmf_score || 0,
              category: idea.category,
              keywords: idea.keywords,
              created_at: idea.created_at
            } as UserExploringIdea;
          })
        );

        setUsersWithSimilarIdeas(usersWithIdeas);
      } else {
        setUsersWithSimilarIdeas([]);
      }
    } catch (error) {
      console.error('Error in loadSimilarUsers:', error);
      setUsersWithSimilarIdeas([]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getRealtimeCount = () => {
    return Object.keys(realtimeUsers).length;
  };

  return (
    <Card className="border-border/50 bg-card/95 backdrop-blur-xl animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Users Exploring Similar Ideas
            </CardTitle>
            <CardDescription>
              See who else is working on similar concepts with their contact info
            </CardDescription>
          </div>
          {getRealtimeCount() > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" />
              {getRealtimeCount()} Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Real-time indicator */}
        {getRealtimeCount() > 1 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {getRealtimeCount() - 1} other {getRealtimeCount() - 1 === 1 ? 'person is' : 'people are'} exploring ideas live
            </p>
          </div>
        )}

        {/* Users list */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading users with similar ideas...
            </p>
          ) : usersWithSimilarIdeas.length > 0 ? (
            <div className="space-y-2">
              {usersWithSimilarIdeas.slice(0, 5).map((user, index) => (
                <div key={user.id}>
                  <div className="p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all hover:shadow-sm bg-background/50">
                    <div className="space-y-3">
                      {/* User info header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm font-medium">{user.email}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Exploring since {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          PMF: {user.pmf_score}%
                        </Badge>
                      </div>

                      {/* Idea preview */}
                      <div className="space-y-1">
                        <p className="text-sm line-clamp-2 text-foreground/90">
                          {user.refined_idea || user.original_idea}
                        </p>
                        {user.category && (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {user.category}
                            </Badge>
                            {user.keywords && user.keywords.length > 0 && (
                              <>
                                {user.keywords.slice(0, 2).map((keyword, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {keyword}
                                  </Badge>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < usersWithSimilarIdeas.length - 1 && index < 4 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
              
              {usersWithSimilarIdeas.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  And {usersWithSimilarIdeas.length - 5} more users exploring similar ideas...
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                No other users with similar ideas found yet
              </p>
              <p className="text-xs text-muted-foreground">
                Ideas will appear here as users make them public
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
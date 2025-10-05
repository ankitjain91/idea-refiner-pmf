import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, TrendingUp, User, Sparkles } from 'lucide-react';
import { SCORE_LABEL } from '@/branding';

interface IdeaWithOwner {
  id: string;
  original_idea: string;
  refined_idea: string | null;
  pmf_score: number;
  category: string | null;
  created_at: string;
  owner_name: string | null;
}

interface CategoryGroup {
  category: string;
  ideas: IdeaWithOwner[];
}

export default function IdeasLeaderboard() {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      // Fetch public ideas with pmf_score > 0
      const { data: ideasData, error: ideasError } = await supabase
        .from('ideas')
        .select('id, original_idea, refined_idea, pmf_score, category, created_at, user_id')
        .eq('is_public', true)
        .order('pmf_score', { ascending: false, nullsFirst: false })
        .limit(100);

      if (ideasError) throw ideasError;

      if (!ideasData || ideasData.length === 0) {
        setCategories([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(ideasData.map(idea => idea.user_id))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.user_id, profile])
      );

      // Transform and merge data
      const ideas: IdeaWithOwner[] = ideasData.map((item) => {
        const profile = profilesMap.get(item.user_id);
        return {
          id: item.id,
          original_idea: item.original_idea,
          refined_idea: item.refined_idea,
          pmf_score: item.pmf_score,
          category: item.category || 'Uncategorized',
          created_at: item.created_at,
          owner_name: profile?.display_name || profile?.full_name || 'Anonymous',
        };
      });

      // Group by category
      const grouped = ideas.reduce((acc, idea) => {
        const cat = idea.category || 'Uncategorized';
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(idea);
        return acc;
      }, {} as Record<string, IdeaWithOwner[]>);

      // Convert to array and sort categories by highest score
      const categoriesArray = Object.entries(grouped)
        .map(([category, ideas]) => ({
          category,
          ideas: ideas.sort((a, b) => b.pmf_score - a.pmf_score),
        }))
        .sort((a, b) => b.ideas[0].pmf_score - a.ideas[0].pmf_score);

      setCategories(categoriesArray);
    } catch (error) {
      console.error('Error loading ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'outline';
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-warning" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-muted-foreground" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-accent" />;
    return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No public ideas with scores yet. Be the first!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          Ideas Leaderboard
        </h1>
        <p className="text-muted-foreground">
          Top-ranked ideas by {SCORE_LABEL}, categorized by industry
        </p>
      </div>

      {categories.map((categoryGroup) => (
        <Card key={categoryGroup.category} className="glass-card card-hover overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10 border-b">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {categoryGroup.category}
              <Badge variant="secondary" className="ml-auto">
                {categoryGroup.ideas.length} {categoryGroup.ideas.length === 1 ? 'idea' : 'ideas'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {categoryGroup.ideas.map((idea, index) => (
                <div
                  key={idea.id}
                  className="p-4 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 flex items-center justify-center">
                      {getRankIcon(index)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {idea.refined_idea || idea.original_idea}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{idea.owner_name}</span>
                          </div>
                        </div>

                        {/* Score Badge */}
                        <Badge
                          variant={getScoreBadgeVariant(idea.pmf_score)}
                          className="flex-shrink-0 px-3 py-1 text-base font-semibold"
                        >
                          {idea.pmf_score}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

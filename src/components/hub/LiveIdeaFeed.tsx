import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface IdeaValidation {
  id: string;
  idea_text: string;
  pmf_score: number | null;
  tam: string | null;
  created_at: string;
  metadata: any;
}

export function LiveIdeaFeed() {
  const [validations, setValidations] = useState<IdeaValidation[]>([]);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    // Load initial data
    loadValidations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('idea-validations-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'idea_validations'
        },
        (payload) => {
          console.log('[LiveIdeaFeed] New validation:', payload);
          const newValidation = payload.new as IdeaValidation;
          
          setValidations(prev => [newValidation, ...prev].slice(0, 10));
          setNewCount(prev => prev + 1);
          
          // Reset new count after 3 seconds
          setTimeout(() => setNewCount(0), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadValidations() {
    const { data, error } = await supabase
      .from('idea_validations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[LiveIdeaFeed] Error loading validations:', error);
      return;
    }

    setValidations(data || []);
  }

  if (validations.length === 0) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Live Idea Validation Feed</h2>
        </div>
        <Card className="p-8 text-center bg-muted/30 border-dashed">
          <p className="text-muted-foreground">Waiting for ideas to be validated...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Live Idea Validation Feed</h2>
          {newCount > 0 && (
            <Badge variant="default" className="animate-pulse">
              +{newCount} new
            </Badge>
          )}
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </Badge>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {validations.map((validation, index) => (
          <Card 
            key={validation.id}
            className={`p-4 hover:bg-muted/50 transition-all ${
              index === 0 && newCount > 0 ? 'animate-in slide-in-from-top border-primary' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate mb-2">
                  {validation.idea_text.length > 80 
                    ? `${validation.idea_text.slice(0, 80)}...` 
                    : validation.idea_text}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {validation.pmf_score != null && (
                    <Badge variant="secondary" className="text-xs">
                      PMF Score: {validation.pmf_score}
                    </Badge>
                  )}
                  {validation.tam && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      TAM: {validation.tam}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(validation.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

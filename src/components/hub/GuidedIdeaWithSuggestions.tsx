import { useState, useEffect } from 'react';
import GuidedIdeaInput from '@/components/GuidedIdeaInput';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, MessageSquare, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface GuidedIdeaWithSuggestionsProps {
  onSubmit: (idea: string, metadata: any) => void;
  value?: string;
}

export default function GuidedIdeaWithSuggestions({ onSubmit, value }: GuidedIdeaWithSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [conversationContext, setConversationContext] = useState<any[]>([]);

  // Fetch initial AI suggestions
  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async (context?: string) => {
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-suggestions', {
        body: { 
          userMessage: context || "I want to start a new business",
          conversationHistory: conversationContext,
          type: 'startup_ideas'
        }
      });

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions.slice(0, 4)); // Keep top 4 suggestions
      } else {
        // Fallback suggestions
        setSuggestions([
          "AI-powered inventory management for small retailers",
          "Sustainable packaging marketplace for e-commerce",
          "Virtual fitness coaching platform with real-time feedback",
          "Educational content creator tools with automated assessments"
        ]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      // Provide fallback suggestions
      setSuggestions([
        "AI tool for automating repetitive business tasks",
        "Platform connecting local service providers with customers",
        "Health tracking app with personalized insights",
        "Learning management system for remote teams"
      ]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    // Parse the suggestion to fill the form
    const metadata = {
      problem: `Current solutions in the market are inefficient`,
      solution: suggestion,
      targetUsers: "businesses",
      uniqueness: "AI-powered automation and insights",
      tags: ["AI/ML", "SaaS"]
    };
    onSubmit(suggestion, metadata);
  };

  const handleCustomSubmit = (idea: string, metadata: any) => {
    // Update conversation context
    setConversationContext(prev => [...prev, 
      { role: 'user', content: idea },
      { role: 'assistant', content: `Analyzing: ${metadata.solution}` }
    ]);
    onSubmit(idea, metadata);
  };

  return (
    <div className="space-y-4">
      {/* AI Suggestions Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-medium">AI Suggested Ideas</h3>
          {loadingSuggestions && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        
        <AnimatePresence mode="wait">
          {loadingSuggestions ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-2"
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-2"
            >
              {suggestions.map((suggestion, idx) => (
                <Card
                  key={idx}
                  className="p-3 cursor-pointer hover:border-primary/50 transition-all hover:bg-primary/5"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm line-clamp-2">{suggestion}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        Quick Start
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchSuggestions()}
            disabled={loadingSuggestions}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Get More Suggestions
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or create your own</span>
        </div>
      </div>

      {/* Original Guided Input */}
      <GuidedIdeaInput onSubmit={handleCustomSubmit} value={selectedSuggestion || value} />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SimpleSessionContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { extractKeywords } from '@/utils/ideaUtils';

export interface IdeaFilters {
  idea_keywords: string[];
  industry: string;
  geography: string;
  time_window: string;
}

export function useIdeaManagement() {
  const { currentSession } = useSession();
  const [filters, setFilters] = useState<IdeaFilters>({
    idea_keywords: [],
    industry: '',
    geography: 'global',
    time_window: 'last_12_months'
  });
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  // Load initial idea from localStorage + keep in sync
  useEffect(() => {
    const recompute = () => {
      // First check if we have a dashboard-specific idea
      const dashboardIdea = localStorage.getItem('dashboardIdea');
      
      // Extract from conversation history if available
      const extractFromConversation = () => {
        const historyRaw = localStorage.getItem('dashboardConversationHistory');
        if (historyRaw) {
          try {
            const messages = JSON.parse(historyRaw);
            // Find the most recent user message; accept questions if nothing else
            let fallbackUser: string | null = null;
            for (let i = messages.length - 1; i >= 0; i--) {
              const msg = messages[i];
              if ((msg.type === 'user' || msg.role === 'user') && typeof msg.content === 'string') {
                const content = msg.content.trim();
                if (!content) continue;
                if (content.length > 20) {
                  const lower = content.toLowerCase();
                  const looksLikeQuestion = /\b(what|how|can you|tell me|explain|why|where|who)\b/.test(lower);
                  if (!looksLikeQuestion) return content;
                  // keep as fallback if nothing better
                  if (!fallbackUser) fallbackUser = content;
                } else if (!fallbackUser && content.length > 8) {
                  fallbackUser = content;
                }
              }
            }
            if (fallbackUser) return fallbackUser;
          } catch {}
        }
        return null;
      };
      
      // Priority: dashboard idea > conversation extraction > localStorage keys
      let ideaToUse = dashboardIdea || extractFromConversation();

      // Fallback: current session state
      if (!ideaToUse && currentSession?.data) {
        const sd: any = currentSession.data;
        if (typeof sd.currentIdea === 'string' && sd.currentIdea.trim()) {
          ideaToUse = sd.currentIdea.trim();
        }
        if (!ideaToUse && Array.isArray(sd.chatHistory)) {
          for (let i = sd.chatHistory.length - 1; i >= 0; i--) {
            const m = sd.chatHistory[i];
            const c = (m?.content || '').trim();
            if (c && c.length > 10 && (m.type === 'user' || m.role === 'user')) {
              ideaToUse = c;
              break;
            }
          }
        }
      }
      
      if (!ideaToUse) {
        const userIdea = localStorage.getItem('userIdea') || '';
        const currentIdea = localStorage.getItem('currentIdea') || '';
        const ideaText = localStorage.getItem('ideaText') || '';
        const pmfCurrentIdea = localStorage.getItem('pmfCurrentIdea') || '';
        ideaToUse = userIdea || currentIdea || ideaText || pmfCurrentIdea;
      }

      // Try metadata as fallback
      const metaRaw = localStorage.getItem('ideaMetadata');
      let metaKeywords: string[] | undefined;
      if (metaRaw) {
        try {
          const meta = JSON.parse(metaRaw);
          if (Array.isArray(meta?.keywords) && meta.keywords.length) {
            metaKeywords = meta.keywords.slice(0, 5);
          }
          if (!ideaToUse) ideaToUse = meta?.refined || meta?.idea_text || meta?.idea || '';
        } catch {}
      }

      // Try to infer from chat histories if still missing
      if (!ideaToUse) {
        try {
          const enhancedRaw = localStorage.getItem('enhancedIdeaChatMessages');
          if (enhancedRaw) {
            const msgs = JSON.parse(enhancedRaw);
            const lastUser = [...msgs].reverse().find((m: any) => (m.type === 'user' || m.role === 'user') && typeof m.content === 'string' && m.content.trim().length > 10);
            if (lastUser?.content) ideaToUse = lastUser.content.trim();
          }
        } catch {}
      }
      if (!ideaToUse) {
        try {
          const chatRaw = localStorage.getItem('chatHistory');
          if (chatRaw) {
            const msgs = JSON.parse(chatRaw);
            const lastUser = [...msgs].reverse().find((m: any) => (m.type === 'user' || m.role === 'user') && typeof m.content === 'string' && m.content.trim().length > 10);
            if (lastUser?.content) ideaToUse = lastUser.content.trim();
          }
        } catch {}
      }

      const keywords = metaKeywords || (ideaToUse ? extractKeywords(ideaToUse) : []);
      console.log('IdeaManagement recompute:', { dashboardIdea, ideaToUse, keywords });

      if (keywords.length) {
        setFilters(prev => ({
          ...prev,
          idea_keywords: keywords,
        }));
        
        // Store in session state for persistence
        sessionStorage.setItem('dashboardKeywords', JSON.stringify(keywords));
        sessionStorage.setItem('dashboardIdeaSource', ideaToUse);
      }
    };

    // Always run recompute to get the latest idea
    recompute();
    
    // After recompute, check if we should use cached keywords
    const sessionKeywords = sessionStorage.getItem('dashboardKeywords');
    if (sessionKeywords) {
      try {
        const keywords = JSON.parse(sessionKeywords);
        // Only use cached keywords if we didn't find any from recompute
        if (keywords.length && filters.idea_keywords.length === 0) {
          setFilters(prev => ({
            ...prev,
            idea_keywords: keywords,
          }));
        }
      } catch {}
    }

    const onStorage = () => recompute();
    const onIdeaUpdated = () => recompute();
    window.addEventListener('storage', onStorage);
    window.addEventListener('idea:updated', onIdeaUpdated as EventListener);
    window.addEventListener('chat:activity', onIdeaUpdated as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('idea:updated', onIdeaUpdated as EventListener);
      window.removeEventListener('chat:activity', onIdeaUpdated as EventListener);
    };
  }, [currentSession]);

  const handleIdeaSubmit = (idea: string, metadata: any) => {
    console.log('IdeaManagement handleIdeaSubmit', { idea, metadata });
    
    let kws = extractKeywords(idea);
    if (!kws.length && Array.isArray(metadata?.tags) && metadata.tags.length) {
      kws = metadata.tags.slice(0, 5);
    }
    console.log('IdeaManagement extracted keywords', kws);

    if (kws.length) {
      setFilters(prev => ({ ...prev, idea_keywords: kws }));
      sessionStorage.setItem('dashboardKeywords', JSON.stringify(kws));
      sessionStorage.setItem('dashboardIdeaSource', idea);
      localStorage.setItem('dashboardIdea', idea);
      toast({ title: 'Idea captured', description: 'Seeding dashboard with AI insights...' });
      setShowQuestionnaire(false);
    } else {
      toast({ title: 'Could not parse idea', description: 'Try editing the idea or add tags.', variant: 'destructive' });
    }
  };

  return {
    filters,
    setFilters,
    showQuestionnaire,
    setShowQuestionnaire,
    handleIdeaSubmit
  };
}

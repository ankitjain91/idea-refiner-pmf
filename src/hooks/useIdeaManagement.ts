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

export interface IdeaConfirmation {
  idea: string;
  metadata: any;
  isOpen: boolean;
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
  const [pendingIdea, setPendingIdea] = useState<IdeaConfirmation>({
    idea: '',
    metadata: null,
    isOpen: false
  });

  // Load initial idea from localStorage + keep in sync
  useEffect(() => {
    const recompute = () => {
      console.log('🔄 [useIdeaManagement] Starting recompute...');
      
      // First check if we have a dashboard-specific idea
      const dashboardIdea = localStorage.getItem('dashboardIdea');
      console.log('📋 [useIdeaManagement] dashboardIdea from localStorage:', dashboardIdea);
      
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
      
      const conversationIdea = extractFromConversation();
      console.log('💬 [useIdeaManagement] Extracted from conversation:', conversationIdea);
      
      // Priority: dashboard idea > conversation extraction > localStorage keys
      let ideaToUse = dashboardIdea || conversationIdea;

      // Fallback: current session state
      if (!ideaToUse && currentSession?.data) {
        const sd: any = currentSession.data;
        if (typeof sd.currentIdea === 'string' && sd.currentIdea.trim()) {
          ideaToUse = sd.currentIdea.trim();
          console.log('📝 [useIdeaManagement] From session data:', ideaToUse);
        }
        if (!ideaToUse && Array.isArray(sd.chatHistory)) {
          for (let i = sd.chatHistory.length - 1; i >= 0; i--) {
            const m = sd.chatHistory[i];
            const c = (m?.content || '').trim();
            if (c && c.length > 10 && (m.type === 'user' || m.role === 'user')) {
              ideaToUse = c;
              console.log('📜 [useIdeaManagement] From session chat history:', ideaToUse);
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
        console.log('🔍 [useIdeaManagement] From various localStorage keys:', {
          userIdea,
          currentIdea,
          ideaText,
          pmfCurrentIdea,
          selected: ideaToUse
        });
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
          console.log('📊 [useIdeaManagement] From metadata:', { meta, metaKeywords, ideaToUse });
        } catch {}
      }

      // Try to infer from chat histories if still missing
      if (!ideaToUse) {
        try {
          const enhancedRaw = localStorage.getItem('enhancedIdeaChatMessages');
          if (enhancedRaw) {
            const msgs = JSON.parse(enhancedRaw);
            const lastUser = [...msgs].reverse().find((m: any) => (m.type === 'user' || m.role === 'user') && typeof m.content === 'string' && m.content.trim().length > 10);
            if (lastUser?.content) {
              ideaToUse = lastUser.content.trim();
              console.log('💭 [useIdeaManagement] From enhanced chat messages:', ideaToUse);
            }
          }
        } catch {}
      }
      if (!ideaToUse) {
        try {
          const chatRaw = localStorage.getItem('chatHistory');
          if (chatRaw) {
            const msgs = JSON.parse(chatRaw);
            const lastUser = [...msgs].reverse().find((m: any) => (m.type === 'user' || m.role === 'user') && typeof m.content === 'string' && m.content.trim().length > 10);
            if (lastUser?.content) {
              ideaToUse = lastUser.content.trim();
              console.log('💬 [useIdeaManagement] From chat history:', ideaToUse);
            }
          }
        } catch {}
      }

      const keywords = metaKeywords || (ideaToUse ? extractKeywords(ideaToUse) : []);
      console.log('✅ [useIdeaManagement] Final recompute result:', { 
        dashboardIdea, 
        ideaToUse, 
        keywords,
        keywordCount: keywords.length 
      });

      if (keywords.length) {
        console.log('🎯 [useIdeaManagement] Setting filters with keywords:', keywords);
        setFilters(prev => ({
          ...prev,
          idea_keywords: keywords,
        }));
        
        // Store in session state for persistence
        sessionStorage.setItem('dashboardKeywords', JSON.stringify(keywords));
        sessionStorage.setItem('dashboardIdeaSource', ideaToUse);
      } else {
        console.warn('⚠️ [useIdeaManagement] No keywords extracted!');
      }
    };

    console.log('🚀 [useIdeaManagement] useEffect triggered');
    
    // Always run recompute to get the latest idea
    recompute();
    
    // After recompute, check if we should use cached keywords
    const sessionKeywords = sessionStorage.getItem('dashboardKeywords');
    console.log('💾 [useIdeaManagement] Session keywords:', sessionKeywords);
    
    if (sessionKeywords) {
      try {
        const keywords = JSON.parse(sessionKeywords);
        // Only use cached keywords if we didn't find any from recompute
        if (keywords.length && filters.idea_keywords.length === 0) {
          console.log('📌 [useIdeaManagement] Using cached session keywords:', keywords);
          setFilters(prev => ({
            ...prev,
            idea_keywords: keywords,
          }));
        }
      } catch (e) {
        console.error('❌ [useIdeaManagement] Failed to parse session keywords:', e);
      }
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
    
    // Store pending idea and show confirmation
    setPendingIdea({
      idea,
      metadata,
      isOpen: true
    });
  };

  const confirmIdea = () => {
    const { idea, metadata } = pendingIdea;
    console.log('🎯 [useIdeaManagement] Confirming and persisting idea:', idea);
    
    let kws = extractKeywords(idea);
    if (!kws.length && Array.isArray(metadata?.tags) && metadata.tags.length) {
      kws = metadata.tags.slice(0, 5);
    }
    console.log('IdeaManagement extracted keywords', kws);

    if (kws.length) {
      // Persist idea across ALL relevant storage keys
      const persistEverywhere = () => {
        // Primary dashboard storage
        localStorage.setItem('dashboardIdea', idea);
        
        // All possible idea keys for maximum compatibility
        localStorage.setItem('userIdea', idea);
        localStorage.setItem('currentIdea', idea);
        localStorage.setItem('ideaText', idea);
        localStorage.setItem('pmfCurrentIdea', idea);
        localStorage.setItem('pmf.user.idea', idea);
        
        // Store metadata if available
        if (metadata) {
          const enrichedMetadata = {
            ...metadata,
            idea,
            idea_text: idea,
            refined: idea,
            keywords: kws,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('ideaMetadata', JSON.stringify(enrichedMetadata));
          localStorage.setItem('pmf.analysis.metadata', JSON.stringify(enrichedMetadata));
        }
        
        // Session storage for immediate access
        sessionStorage.setItem('dashboardKeywords', JSON.stringify(kws));
        sessionStorage.setItem('dashboardIdeaSource', idea);
        
        console.log('✨ [useIdeaManagement] Idea persisted everywhere:', { 
          idea, 
          keywords: kws,
          storageKeys: [
            'dashboardIdea', 'userIdea', 'currentIdea', 
            'ideaText', 'pmfCurrentIdea', 'pmf.user.idea',
            'ideaMetadata', 'pmf.analysis.metadata'
          ]
        });
      };
      
      persistEverywhere();
      setFilters(prev => ({ ...prev, idea_keywords: kws }));
      
      toast({ 
        title: '✅ Great! Your idea has been saved', 
        description: 'The dashboard is now analyzing your startup idea with real market data...' 
      });
      
      // Trigger storage event to notify other components
      window.dispatchEvent(new CustomEvent('idea:updated', { detail: { idea, keywords: kws } }));
      
      setShowQuestionnaire(false);
      setPendingIdea({ idea: '', metadata: null, isOpen: false });
    } else {
      toast({ 
        title: 'Could not parse idea', 
        description: 'Try editing the idea or add tags.', 
        variant: 'destructive' 
      });
    }
  };

  const cancelIdeaConfirmation = () => {
    setPendingIdea({ idea: '', metadata: null, isOpen: false });
  };

  return {
    filters,
    setFilters,
    showQuestionnaire,
    setShowQuestionnaire,
    handleIdeaSubmit,
    pendingIdea,
    confirmIdea,
    cancelIdeaConfirmation
  };
}

import { useState, useRef, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/contexts/SimpleSessionContext';
import { ChatState, WrinkleData, WRINKLE_TIER_LABELS, WRINKLE_TIER_TOOLTIPS, WrinkleTier } from './types';
import { Message, ResponseMode } from '../chat/types';

export const useChatState = (sessionName: string = 'New Chat Session') => {
  const [responseMode, setResponseMode] = useState<ResponseMode>(() => {
    try {
      return (localStorage.getItem('responseMode') as ResponseMode) || 'verbose';
    } catch {
      return 'verbose';
    }
  });
  
  const [currentIdea, setCurrentIdea] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [wrinklePoints, setWrinklePoints] = useState(0);
  const [hoveringBrain, setHoveringBrain] = useState(false);
  const [hasValidIdea, setHasValidIdea] = useState(false);
  const [persistenceLevel, setPersistenceLevel] = useState(0);
  const [anonymous, setAnonymous] = useState(false);

  const { currentSession } = useSession();
  const { toast } = useToast();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isDefaultSessionName = !currentSession?.name;
  const displaySessionName = currentSession?.name || sessionName || 'New Chat Session';

  return {
    // State
    responseMode,
    setResponseMode,
    currentIdea,
    setCurrentIdea,
    messages,
    setMessages,
    input,
    setInput,
    isTyping,
    setIsTyping,
    conversationStarted,
    setConversationStarted,
    isRefining,
    setIsRefining,
    wrinklePoints,
    setWrinklePoints,
    hoveringBrain,
    setHoveringBrain,
    hasValidIdea,
    setHasValidIdea,
    persistenceLevel,
    setPersistenceLevel,
    anonymous,
    setAnonymous,
    
    // Refs and utilities
    messagesEndRef,
    inputRef,
    toast,
    currentSession,
    isDefaultSessionName,
    displaySessionName
  };
};

export const useWrinkleData = (wrinklePoints: number): WrinkleData => {
  const wrinkleTier = useMemo(() => {
    const w = wrinklePoints;
    if (w < 5) return 0 as WrinkleTier; // embryonic
    if (w < 20) return 1 as WrinkleTier; // forming
    if (w < 50) return 2 as WrinkleTier; // structuring
    if (w < 100) return 3 as WrinkleTier; // networked
    if (w < 200) return 4 as WrinkleTier; // compounding
    return 5 as WrinkleTier; // legendary
  }, [wrinklePoints]);

  const dynamicBrainTooltip = useMemo(() => {
    const baseTooltip = WRINKLE_TIER_TOOLTIPS[wrinkleTier];
    const pointsToNext = wrinkleTier === 5 ? 0 : 
      [5, 20, 50, 100, 200][wrinkleTier] - wrinklePoints;
    
    if (wrinkleTier === 5) {
      return `${baseTooltip} You've achieved legendary status! 🏆`;
    }
    
    return `${baseTooltip} (${pointsToNext} points to next level)`;
  }, [wrinkleTier, wrinklePoints]);

  return {
    tier: wrinkleTier,
    label: WRINKLE_TIER_LABELS[wrinkleTier],
    tooltip: dynamicBrainTooltip
  };
};

export const useScrollToBottom = (messagesEndRef: React.RefObject<HTMLDivElement>) => {
  return useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end' 
      });
    }, 100);
  }, [messagesEndRef]);
};
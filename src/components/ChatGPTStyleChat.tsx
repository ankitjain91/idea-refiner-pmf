import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot,
  User,
  Loader2,
  BarChart,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Circle,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/EnhancedAuthContext';

interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  metadata?: any;
  isTyping?: boolean;
  pmfAnalysis?: any;
}

interface ChatGPTStyleChatProps {
  onAnalysisReady?: (idea: string, metadata: any) => void;
  showDashboard?: boolean;
  className?: string;
}

const ANALYSIS_QUESTIONS = [
  "What problem does your product solve?",
  "Who is your target audience?",
  "What's your unique value proposition?",
  "What's your monetization strategy?",
  "Who are your main competitors?"
];

export default function ChatGPTStyleChat({ 
  onAnalysisReady, 
  showDashboard = false,
  className 
}: ChatGPTStyleChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentIdea, setCurrentIdea] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [analysisAnswers, setAnalysisAnswers] = useState<Record<string, string>>({});
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isRefinementMode, setIsRefinementMode] = useState(true);
  const [showStartAnalysisButton, setShowStartAnalysisButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const autoSaveRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    // Create new session on mount
    if (user) {
      createNewSession();
    }
  }, [user]);

  // Auto-save session every 5 seconds
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      autoSaveRef.current = setInterval(() => {
        saveSession();
      }, 5000);

      return () => {
        if (autoSaveRef.current) {
          clearInterval(autoSaveRef.current);
        }
      };
    }
  }, [sessionId, messages, analysisAnswers]);

  const generateRandomSuggestions = () => {
    const allSuggestions = [
      "AI-powered personal finance assistant for millennials",
      "Sustainable fashion marketplace for Gen Z",
      "Mental health support platform with AI coaching",
      "Blockchain-based supply chain for small businesses",
      "EdTech platform for personalized learning",
      "Smart home automation for elderly care",
      "Virtual fitness trainer with real-time feedback",
      "Carbon footprint tracker for conscious consumers",
      "Remote team collaboration tool for startups",
      "Plant-based meal planning app with nutrition AI",
      "Freelancer marketplace with escrow payments",
      "Language learning app using VR technology",
      "Pet care platform connecting vets and owners",
      "Travel planning AI for budget backpackers",
      "Digital wellness app for screen time management",
      "Food waste reduction app for restaurants",
      "Cryptocurrency portfolio manager for beginners",
      "3D printing marketplace for custom products",
      "Virtual interior design assistant",
      "Skill-sharing platform for retirees"
    ];
    
    // Shuffle and pick 4 random suggestions
    const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  };

  const createNewSession = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .insert({
          user_id: user.id,
          session_name: 'New Analysis Session',
          idea: '',
          metadata: { 
            messages: [],
            analysisAnswers: {},
            analysisProgress: 0
          }
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
      
      // Add welcome message with random suggestions
      const welcomeMessage: Message = {
        id: `msg-welcome-${Date.now()}`,
        type: 'system',
        content: "👋 Welcome! I'm your PM-Fit Analyzer. Share your product idea and I'll help you refine it. When you're ready, we can run a comprehensive analysis to evaluate its market fit potential.",
        timestamp: new Date(),
        suggestions: generateRandomSuggestions()
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const saveSession = async () => {
    if (!sessionId || !user) return;

    try {
      const { error } = await supabase
        .from('analysis_sessions')
        .update({
          metadata: {
            messages: messages.map(m => ({
              id: m.id,
              type: m.type,
              content: m.content,
              timestamp: m.timestamp.toISOString(),
              suggestions: m.suggestions || [],
              metadata: m.metadata || {}
            })),
            analysisAnswers,
            analysisProgress,
            currentQuestionIndex
          },
          idea: currentIdea,
          session_name: currentIdea || 'Analysis Session',
          last_accessed: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const startAnalysis = async (ideaToAnalyze?: string) => {
    const ideaToUse = ideaToAnalyze || currentIdea;
    
    if (!ideaToUse) {
      toast({
        title: "No idea provided",
        description: "Please share your product idea first",
        variant: "destructive"
      });
      return;
    }
    
    // If we're starting with a new idea, set it as current
    if (ideaToAnalyze && !currentIdea) {
      setCurrentIdea(ideaToAnalyze);
    }

    // Reset analysis state for fresh analysis
    setIsAnalyzing(true);
    setIsRefinementMode(false);
    setShowStartAnalysisButton(false);
    setCurrentQuestionIndex(0);
    setAnalysisProgress(0);
    setAnalysisAnswers({}); // Clear previous answers for fresh analysis
    
    // Add loading animation while preparing analysis
    const loadingMessage: Message = {
      id: `msg-loading-analysis-${Date.now()}`,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, loadingMessage]);
    
    // Get AI-suggested answer for the first question
    const firstQuestion = ANALYSIS_QUESTIONS[0];
    
    try {
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: `Help me answer: ${firstQuestion}`,
          idea: ideaToUse,
          currentQuestion: firstQuestion,
          questionNumber: 0,
          analysisContext: {}
        }
      });

      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isTyping));

      // Parse suggestions safely
      let suggestions = [];
      if (data) {
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
          } catch {
            suggestions = [];
          }
        } else if (typeof data === 'object') {
          suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
        }
      }
      
      const analysisMessage: Message = {
        id: `msg-analysis-${Date.now()}`,
        type: 'bot',
        content: `Great! Let's analyze "${ideaToUse}". I'll ask you ${ANALYSIS_QUESTIONS.length} key questions to evaluate your product-market fit.\n\n${firstQuestion}`,
        timestamp: new Date(),
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };
      
      setMessages(prev => [...prev, analysisMessage]);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      
      const analysisMessage: Message = {
        id: `msg-analysis-${Date.now()}`,
        type: 'bot',
        content: `Great! Let's analyze "${ideaToUse}". I'll ask you ${ANALYSIS_QUESTIONS.length} key questions to evaluate your product-market fit.\n\n${firstQuestion}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, analysisMessage]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // If in refinement mode and not analyzing
    if (isRefinementMode && !isAnalyzing) {
      // If this is the first message, validate it's an actual idea
      if (!currentIdea) {
        // Simple validation to check if it looks like an idea
        const looksLikeIdea = input.length > 10 && 
          !input.match(/^(hi|hello|hey|test|testing|ok|yes|no|help|thanks|bye|good|bad|nice|cool|wow|lol|haha|what|where|when|who|why|how)$/i) &&
          (input.includes(' ') || input.length > 20);
        
        if (!looksLikeIdea) {
          const funnyResponses = [
            "🎭 Nice try, but that's not an idea! That's like calling a potato a spaceship. Give me a real product idea!",
            "🤔 Hmm, that doesn't smell like an idea... it smells like... *sniff sniff*... procrastination! Come on, hit me with your best shot!",
            "🎪 Ladies and gentlemen, we have a trickster in the house! But I'm not falling for it. Give me a REAL idea, not whatever that was!",
            "🚨 IDEA POLICE HERE! That's not an idea, that's just words pretending to be an idea. Try again with something that actually solves a problem!",
            "🦄 I asked for an idea, not a unicorn's sneeze! Come on, give me something with substance - like 'an app that...' or 'a platform for...'",
            "🎮 Error 404: Idea not found! You've entered the cheat code for 'no effort'. Please insert a real product idea to continue!",
            "🍕 That's about as much of an idea as pineapple is a pizza topping (controversial, I know). Give me something real to work with!",
            "🤖 Beep boop! My idea detector is showing... nothing. Absolutely nothing. It's flatter than a pancake. Feed me a real idea!",
            "🎯 You missed the target by... oh, about a mile. That's not an idea, that's just keyboard gymnastics. Try again with an actual concept!",
            "🧙‍♂️ My crystal ball shows... cloudy with a chance of 'that's not an idea'. Cast a better spell and give me something innovative!"
          ];
          
          const randomResponse = funnyResponses[Math.floor(Math.random() * funnyResponses.length)];
          
          const validationMessage: Message = {
            id: `msg-validation-${Date.now()}`,
            type: 'bot',
            content: randomResponse,
            timestamp: new Date(),
            suggestions: [
              "AI-powered personal finance assistant",
              "Sustainable fashion marketplace",
              "Mental health support platform",
              "Smart home automation for elderly"
            ]
          };
          
          setMessages(prev => [...prev, validationMessage]);
          setInput('');
          return;
        }
        
        setCurrentIdea(input);
        setShowStartAnalysisButton(true);
      }
      
      setInput('');
      setIsLoading(true);
      
      // Add loading animation message
      const loadingMessage: Message = {
        id: `msg-loading-${Date.now()}`,
        type: 'bot',
        content: '',
        timestamp: new Date(),
        isTyping: true
      };
      setMessages(prev => [...prev, loadingMessage]);
      
      try {
        // Get AI response for refinement
        const { data, error } = await supabase.functions.invoke('idea-chat', {
          body: { 
            message: input,
            conversationHistory: messages.map(m => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: m.content
            })),
            idea: currentIdea || input,
            refinementMode: true
          }
        });

        // Remove loading message
        setMessages(prev => prev.filter(msg => !msg.isTyping));

        if (!error && data) {
          // Handle both string and object responses
          let responseContent = '';
          let responseSuggestions = [];
          
          if (!data) {
            throw new Error('No data received from server');
          }
          
          // Parse the response data
          if (typeof data === 'string') {
            // If data is a string, try to parse it as JSON
            try {
              const parsed = JSON.parse(data);
              responseContent = parsed.response || parsed.message || '';
              responseSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
            } catch {
              // If parsing fails, use the string as is
              responseContent = data;
              responseSuggestions = [];
            }
          } else if (typeof data === 'object') {
            // Handle object response
            responseContent = data.response || data.message || '';
            responseSuggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
          }
          
          // Validate we have content
          if (!responseContent || responseContent.trim() === '') {
            console.error('Empty response content:', data);
            responseContent = "I understand. Let me help you refine your idea further.";
          }
          
          const botMessage: Message = {
            id: `msg-${Date.now()}-bot`,
            type: 'bot',
            content: responseContent,
            timestamp: new Date(),
            suggestions: responseSuggestions.length > 0 ? responseSuggestions : undefined
          };
          
          setMessages(prev => [...prev, botMessage]);
        } else {
          throw new Error('No data received');
        }
      } catch (error) {
        console.error('Chat error:', error);
        // Remove loading message
        setMessages(prev => prev.filter(msg => !msg.isTyping));
        
        const errorMessage: Message = {
          id: `msg-error-${Date.now()}`,
          type: 'bot',
          content: "I apologize, I'm having trouble processing your request. Please try again.",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      
      return;
    }

    // Handle analysis flow
    if (isAnalyzing && currentQuestionIndex < ANALYSIS_QUESTIONS.length) {
      const question = ANALYSIS_QUESTIONS[currentQuestionIndex];
      setAnalysisAnswers(prev => ({
        ...prev,
        [question]: input
      }));
      
      const newProgress = ((currentQuestionIndex + 1) / ANALYSIS_QUESTIONS.length) * 100;
      setAnalysisProgress(newProgress);
      
      if (currentQuestionIndex + 1 < ANALYSIS_QUESTIONS.length) {
        // Ask next question with AI suggestions
        setCurrentQuestionIndex(prev => prev + 1);
        const nextQuestion = ANALYSIS_QUESTIONS[currentQuestionIndex + 1];
        
        setInput('');
        setIsLoading(true);
        
        try {
          const { data, error } = await supabase.functions.invoke('idea-chat', {
            body: { 
              message: `Help me answer: ${nextQuestion}`,
              idea: currentIdea,
              currentQuestion: nextQuestion,
              questionNumber: currentQuestionIndex + 1,
              analysisContext: analysisAnswers
            }
          });

          const questionMessage: Message = {
            id: `msg-question-${Date.now()}`,
            type: 'bot',
            content: nextQuestion,
            timestamp: new Date(),
            suggestions: data?.suggestions || []
          };
          
          setMessages(prev => [...prev, questionMessage]);
        } catch (error) {
          console.error('Error getting suggestions:', error);
          const questionMessage: Message = {
            id: `msg-question-${Date.now()}`,
            type: 'bot',
            content: nextQuestion,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, questionMessage]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Analysis complete
        completeAnalysis();
      }
      
      setInput('');
      return;
    }

    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: input,
          conversationHistory: messages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          idea: currentIdea,
          analysisContext: analysisAnswers
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Parse response with robust error handling
      let responseContent = '';
      let suggestions = [];
      let metadata = {};
      
      if (data) {
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            responseContent = parsed.response || parsed.message || '';
            suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
            metadata = parsed.metadata || {};
          } catch {
            responseContent = data;
          }
        } else if (typeof data === 'object') {
          responseContent = data.response || data.message || '';
          suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
          metadata = data.metadata || {};
        }
      }
      
      if (!responseContent) {
        responseContent = "Let me help you with that...";
      }

      const botMessage: Message = {
        id: `msg-${Date.now()}-bot`,
        type: 'bot',
        content: responseContent,
        timestamp: new Date(),
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeAnalysis = async () => {
    setIsAnalyzing(false);
    setAnalysisProgress(100);
    
    // Generate PM-Fit analysis
    const loadingMsg: Message = {
      id: `msg-loading-pmf-${Date.now()}`,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, loadingMsg]);
    
    try {
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: currentIdea,
          generatePMFAnalysis: true,
          analysisContext: analysisAnswers
        }
      });
      
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      
      if (!error && data) {
        const pmfScore = data.pmfAnalysis?.pmfScore || 0;
        const isGoodScore = pmfScore >= 70;
        
        const completionMessage: Message = {
          id: `msg-complete-${Date.now()}`,
          type: 'system',
          content: `🎯 Analysis complete! Your PM-Fit score is **${pmfScore}/100**.\n\n${
            isGoodScore 
              ? "✨ Great score! Your idea shows strong market potential. You can view the detailed analysis or continue refining for even better results."
              : `📈 There's room for improvement. ${pmfScore < 40 ? 'Your idea needs significant refinement.' : 'Your idea has potential but could be stronger.'} Let's work on improving it!`
          }`,
          timestamp: new Date(),
          pmfAnalysis: data.pmfAnalysis,
          suggestions: isGoodScore ? [
            "View detailed PM-Fit analysis",
            "Start with a new idea",
            "Refine this idea further",
            "Export analysis report"
          ] : [
            "Refine my idea based on feedback",
            "View improvement suggestions",
            "Re-analyze with changes",
            "Start fresh with new approach"
          ]
        };
        
        setMessages(prev => [...prev, completionMessage]);
        
        // Show refinement options based on score
        if (!isGoodScore) {
          setTimeout(() => {
            const refinementPrompt: Message = {
              id: `msg-refine-${Date.now()}`,
              type: 'bot',
              content: "Would you like to refine your idea? I can help you improve specific aspects to increase your PM-Fit score.",
              timestamp: new Date(),
              suggestions: [
                "Help me improve the value proposition",
                "Refine the target audience",
                "Strengthen the monetization strategy",
                "Address competitive weaknesses"
              ]
            };
            setMessages(prev => [...prev, refinementPrompt]);
            setIsRefinementMode(true);
            setCurrentQuestionIndex(0);
            setAnalysisAnswers({});
          }, 1500);
        }
        
        // Only trigger onAnalysisReady if score is good or user explicitly wants to proceed
        if (isGoodScore && onAnalysisReady) {
          const analysisData = {
            idea: currentIdea,
            answers: analysisAnswers,
            pmfAnalysis: data.pmfAnalysis,
            sessionId,
            timestamp: new Date().toISOString()
          };
          
          onAnalysisReady(currentIdea, analysisData);
        }
      }
    } catch (error) {
      console.error('Error generating PMF analysis:', error);
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      
      const errorMessage: Message = {
        id: `msg-error-${Date.now()}`,
        type: 'system',
        content: "Failed to generate analysis. Let's continue refining your idea.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    
    // Save final session state
    await saveSession();
  };

  const askNextQuestion = async (questionIndex: number) => {
    const nextQuestion = ANALYSIS_QUESTIONS[questionIndex];
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: `Help me answer: ${nextQuestion}`,
          idea: currentIdea,
          currentQuestion: nextQuestion,
          questionNumber: questionIndex,
          analysisContext: analysisAnswers
        }
      });

      // Parse suggestions safely
      let suggestions = [];
      if (data && !error) {
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
          } catch {
            suggestions = [];
          }
        } else if (typeof data === 'object') {
          suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
        }
      }

      const questionMessage: Message = {
        id: `msg-question-${Date.now()}`,
        type: 'bot',
        content: nextQuestion,
        timestamp: new Date(),
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };
      
      setMessages(prev => [...prev, questionMessage]);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      const questionMessage: Message = {
        id: `msg-question-${Date.now()}`,
        type: 'bot',
        content: nextQuestion,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, questionMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionRefinement = async (idea: string) => {
    setIsLoading(true);
    
    // Add loading animation message
    const loadingMessage: Message = {
      id: `msg-loading-${Date.now()}`,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, loadingMessage]);
    
    try {
      // Get AI response for refinement
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: `Tell me more about this idea: ${idea}`,
          idea: idea,
          refinementMode: true
        }
      });

      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isTyping));

      if (!error && data) {
        // Handle both string and object responses
        let responseContent = '';
        let responseSuggestions = [];
        
        try {
          if (typeof data === 'string') {
            // If data is a string, try to parse it as JSON first
            try {
              const parsed = JSON.parse(data);
              responseContent = parsed.response || parsed.message || data;
              responseSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
            } catch {
              // If parsing fails, use the string as is
              responseContent = data;
            }
          } else if (typeof data === 'object') {
            // Handle object response
            responseContent = data.response || data.message || '';
            responseSuggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
          }
        } catch (parseError) {
          console.error('Error parsing refinement response:', parseError);
          responseContent = `Great idea! Let me help you explore "${idea}". What specific aspects would you like to refine or discuss?`;
        }
        
        const botMessage: Message = {
          id: `msg-${Date.now()}-bot`,
          type: 'bot',
          content: responseContent || `Great idea! Let me help you explore "${idea}". What specific aspects would you like to refine or discuss?`,
          timestamp: new Date(),
          suggestions: responseSuggestions.length > 0 ? responseSuggestions : [
            `What problem does ${idea} solve?`,
            `Who would use ${idea}?`,
            `How would ${idea} make money?`,
            `What makes ${idea} unique?`
          ]
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isTyping));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Prevent duplicate processing
    if (isLoading) return;
    
    // Always create user message with consistent animation
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: suggestion,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Add small delay to show user message animation before bot response
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Handle based on current state
    if (!currentIdea && !isAnalyzing) {
      // First message - validate and set as idea
      const looksLikeIdea = suggestion.length > 10;
      
      if (!looksLikeIdea) {
        const funnyResponses = [
          "🎭 Nice try, but that's not an idea! That's like calling a potato a spaceship. Give me a real product idea!",
          "🤔 Hmm, that doesn't smell like an idea... it smells like... *sniff sniff*... procrastination! Come on, hit me with your best shot!",
          "🎪 Ladies and gentlemen, we have a trickster in the house! But I'm not falling for it. Give me a REAL idea, not whatever that was!"
        ];
        
        const randomResponse = funnyResponses[Math.floor(Math.random() * funnyResponses.length)];
        
        // Add loading animation
        const loadingMessage: Message = {
          id: `msg-loading-${Date.now()}`,
          type: 'bot',
          content: '',
          timestamp: new Date(),
          isTyping: true
        };
        setMessages(prev => [...prev, loadingMessage]);
        
        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Remove loading and add response
        setMessages(prev => prev.filter(msg => !msg.isTyping));
        
        const validationMessage: Message = {
          id: `msg-validation-${Date.now()}`,
          type: 'bot',
          content: randomResponse,
          timestamp: new Date(),
          suggestions: [
            "AI-powered personal finance assistant",
            "Sustainable fashion marketplace",
            "Mental health support platform",
            "Smart home automation for elderly"
          ]
        };
        
        setMessages(prev => [...prev, validationMessage]);
        return;
      }
      
      setCurrentIdea(suggestion);
      setShowStartAnalysisButton(true);
      setInput('');
      
      // Get AI response about the idea for refinement
      await handleSuggestionRefinement(suggestion);
    } else if (isRefinementMode && !isAnalyzing) {
      // During refinement - process as regular message with consistent animation
      setInput('');
      setIsLoading(true);
      
      // Add loading animation message
      const loadingMessage: Message = {
        id: `msg-loading-${Date.now()}`,
        type: 'bot',
        content: '',
        timestamp: new Date(),
        isTyping: true
      };
      setMessages(prev => [...prev, loadingMessage]);
      
      // Add slight delay for natural feel
      await new Promise(resolve => setTimeout(resolve, 600));
      
      try {
        // Get AI response for refinement
        const { data, error } = await supabase.functions.invoke('idea-chat', {
          body: { 
            message: suggestion,
            conversationHistory: messages.map(m => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: m.content
            })),
            idea: currentIdea || suggestion,
            refinementMode: true
          }
        });

        // Remove loading message
        setMessages(prev => prev.filter(msg => !msg.isTyping));

        if (!error && data) {
          // Handle both string and object responses with better error handling
          let responseContent = '';
          let responseSuggestions = [];
          
          try {
            if (typeof data === 'string') {
              // If data is a string, try to parse it as JSON first
              try {
                const parsed = JSON.parse(data);
                responseContent = parsed.response || parsed.message || data;
                responseSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
              } catch {
                // If parsing fails, use the string as is
                responseContent = data;
              }
            } else if (typeof data === 'object') {
              // Handle object response
              responseContent = data.response || data.message || '';
              responseSuggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
            }
          } catch (parseError) {
            console.error('Error parsing suggestion response:', parseError);
            responseContent = 'I understand. Let me help you explore that further.';
          }
          
          if (responseContent) {
            const botMessage: Message = {
              id: `msg-${Date.now()}-bot`,
              type: 'bot',
              content: responseContent,
              timestamp: new Date(),
              suggestions: responseSuggestions
            };
            
            setMessages(prev => [...prev, botMessage]);
          } else {
            console.error('Invalid response structure:', data);
            throw new Error('Invalid response format');
          }
        } else {
          throw new Error('No data received');
        }
      } catch (error) {
        console.error('Chat error:', error);
        // Remove loading message
        setMessages(prev => prev.filter(msg => !msg.isTyping));
        
        const errorMessage: Message = {
          id: `msg-error-${Date.now()}`,
          type: 'bot',
          content: "I apologize, I'm having trouble processing your request. Please try again.",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    } else if (isAnalyzing) {
      // During analysis - use the suggestion as the answer with consistent animation
      const question = ANALYSIS_QUESTIONS[currentQuestionIndex];
      setAnalysisAnswers(prev => ({
        ...prev,
        [question]: suggestion
      }));
      
      const newProgress = ((currentQuestionIndex + 1) / ANALYSIS_QUESTIONS.length) * 100;
      setAnalysisProgress(newProgress);
      
      if (currentQuestionIndex + 1 < ANALYSIS_QUESTIONS.length) {
        // Ask next question with AI suggestions
        setCurrentQuestionIndex(prev => prev + 1);
        const nextQuestion = ANALYSIS_QUESTIONS[currentQuestionIndex + 1];
        
        setInput('');
        setIsLoading(true);
        
        // Add loading animation message
        const loadingMessage: Message = {
          id: `msg-loading-${Date.now()}`,
          type: 'bot',
          content: '',
          timestamp: new Date(),
          isTyping: true
        };
        setMessages(prev => [...prev, loadingMessage]);
        
        // Add natural typing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const { data, error } = await supabase.functions.invoke('idea-chat', {
            body: { 
              message: `Help me answer: ${nextQuestion}`,
              idea: currentIdea,
              currentQuestion: nextQuestion,
              questionNumber: currentQuestionIndex + 1,
              analysisContext: analysisAnswers
            }
          });

          // Remove loading message
          setMessages(prev => prev.filter(msg => !msg.isTyping));

          const questionMessage: Message = {
            id: `msg-question-${Date.now()}`,
            type: 'bot',
            content: nextQuestion,
            timestamp: new Date(),
            suggestions: data?.suggestions || []
          };
          
          setMessages(prev => [...prev, questionMessage]);
        } catch (error) {
          console.error('Error getting suggestions:', error);
          // Remove loading message
          setMessages(prev => prev.filter(msg => !msg.isTyping));
          
          const questionMessage: Message = {
            id: `msg-question-${Date.now()}`,
            type: 'bot',
            content: nextQuestion,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, questionMessage]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Analysis complete with animation
        setIsLoading(true);
        
        // Add completion loading animation
        const loadingMessage: Message = {
          id: `msg-loading-complete-${Date.now()}`,
          type: 'bot',
          content: '',
          timestamp: new Date(),
          isTyping: true
        };
        setMessages(prev => [...prev, loadingMessage]);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Remove loading message
        setMessages(prev => prev.filter(msg => !msg.isTyping));
        
        completeAnalysis();
        setIsLoading(false);
      }
    }
    
    setInput('');
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header with Progress */}
      {isAnalyzing && (
        <div className="border-b p-4 bg-muted/10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Analysis Progress</h3>
              <span className="text-xs text-muted-foreground">
                Question {currentQuestionIndex + 1} of {ANALYSIS_QUESTIONS.length}
              </span>
            </div>
            <Progress value={analysisProgress} className="h-2" />
            <div className="flex gap-2 mt-3">
              {ANALYSIS_QUESTIONS.map((q, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    idx < currentQuestionIndex && "text-primary",
                    idx === currentQuestionIndex && "text-primary font-medium",
                    idx > currentQuestionIndex && "text-muted-foreground"
                  )}
                >
                  {idx < currentQuestionIndex ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : idx === currentQuestionIndex ? (
                    <Circle className="h-3 w-3 fill-primary" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4 pb-32">
          {/* Welcome Card with Suggestions */}
          {messages.length === 1 && messages[0].type === 'system' && (
            <div className="mb-8">
              <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
                <div className="relative p-8 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                        <Bot className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-green-400 rounded-full" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Welcome to PM-Fit Analyzer
                      </h2>
                      <p className="text-muted-foreground mt-2">
                        {messages[0].content}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        <Sparkles className="h-3 w-3 text-yellow-400" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Popular startup ideas - Click to try:</p>
                    </div>
                    <div className="grid gap-3">
                      {messages[0].suggestions?.map((suggestion, idx) => {
                        // Beautiful emoji collection for suggestions
                        const suggestionEmojis = ['✨', '🚀', '💡', '🎯', '⚡', '🌟', '🔥', '💎'];
                        const emoji = suggestionEmojis[idx % suggestionEmojis.length];
                        
                        return (
                          <Button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            variant="outline"
                            className="relative justify-start text-left h-auto py-4 px-5 bg-card/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative flex items-center gap-3 w-full">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-200 group-hover:scale-110">
                                <span className="text-lg animate-fade-in">{emoji}</span>
                              </div>
                              <span className="text-sm flex-1 text-foreground/90 group-hover:text-foreground transition-colors">{suggestion}</span>
                              <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0" />
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.type === 'user' && 'justify-end',
                msg.type === 'system' && 'justify-center'
              )}
            >
              {msg.type === 'system' ? (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm max-w-md text-center">
                  <ReactMarkdown 
                    className="prose prose-sm dark:prose-invert max-w-none"
                    components={{
                      p: ({children}) => <p className="mb-0">{children}</p>,
                      strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <>
                  {msg.type === 'bot' && (
                    <div className="relative">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[75%] space-y-2",
                    msg.type === 'user' ? 'items-end' : 'items-start'
                  )}>
                    <div
                      className={cn(
                        "rounded-2xl px-5 py-3.5 shadow-md transition-all duration-200",
                        msg.type === 'user' 
                          ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground ml-auto' 
                          : 'bg-card border border-border/50 hover:shadow-lg'
                      )}
                    >
                      {msg.isTyping ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed">
                          <ReactMarkdown 
                            className="prose prose-sm dark:prose-invert max-w-none"
                            components={{
                              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                              em: ({children}) => <em className="italic">{children}</em>,
                              ul: ({children}) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                              li: ({children}) => <li className="mb-1">{children}</li>,
                              code: ({children}) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                              pre: ({children}) => <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-2">{children}</pre>,
                              blockquote: ({children}) => <blockquote className="border-l-2 border-primary pl-4 italic my-2">{children}</blockquote>,
                              h1: ({children}) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                              h2: ({children}) => <h2 className="text-lg font-semibold mb-2">{children}</h2>,
                              h3: ({children}) => <h3 className="text-base font-semibold mb-1">{children}</h3>,
                              a: ({children, href}) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                          AI-Powered Suggestions:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {msg.suggestions.map((suggestion, idx) => {
                            // Beautiful emoji collection for inline suggestions
                            const inlineEmojis = ['💫', '🎨', '🔮', '🌈', '⭐', '🪄', '🌺', '🦋'];
                            const emoji = inlineEmojis[idx % inlineEmojis.length];
                            
                            return (
                              <Button
                                key={idx}
                                onClick={() => {
                                  // Handle special action suggestions
                                  if (suggestion === "View detailed PM-Fit analysis" && msg.pmfAnalysis) {
                                    if (onAnalysisReady) {
                                      const analysisData = {
                                        idea: currentIdea,
                                        answers: analysisAnswers,
                                        pmfAnalysis: msg.pmfAnalysis,
                                        sessionId,
                                        timestamp: new Date().toISOString()
                                      };
                                      onAnalysisReady(currentIdea, analysisData);
                                    }
                                  } else if (suggestion === "Re-analyze with changes" || suggestion === "Refine this idea further") {
                                    // Enable refinement mode for iteration
                                    setShowStartAnalysisButton(true);
                                    setIsRefinementMode(true);
                                    setIsAnalyzing(false);
                                    setCurrentQuestionIndex(0);
                                    setAnalysisAnswers({});
                                    const refineMsg: Message = {
                                      id: `msg-refine-${Date.now()}`,
                                      type: 'bot',
                                      content: "Let's refine your idea to improve the PM-Fit score. What specific aspects would you like to enhance?",
                                      timestamp: new Date(),
                                      suggestions: [
                                        "Improve the value proposition",
                                        "Better define target audience",
                                        "Strengthen monetization model",
                                        "Differentiate from competitors"
                                      ]
                                    };
                                    setMessages(prev => [...prev, refineMsg]);
                                  } else if (suggestion === "Refine my idea based on feedback") {
                                    setIsRefinementMode(true);
                                    handleSuggestionClick("Let me refine my idea based on the analysis feedback");
                                  } else if (suggestion === "Start with a new idea" || suggestion === "Start fresh with new approach") {
                                    // Reset everything for a new idea
                                    setCurrentIdea('');
                                    setAnalysisAnswers({});
                                    setCurrentQuestionIndex(0);
                                    setIsAnalyzing(false);
                                    setIsRefinementMode(true);
                                    setShowStartAnalysisButton(false);
                                    setAnalysisProgress(0);
                                    const resetMsg: Message = {
                                      id: `msg-reset-${Date.now()}`,
                                      type: 'bot',
                                      content: "Let's start fresh! Share your new product idea and I'll help you refine and analyze it.",
                                      timestamp: new Date(),
                                      suggestions: [
                                        "AI-powered mental health app",
                                        "Sustainable fashion marketplace",
                                        "Remote work collaboration tool",
                                        "Educational platform for seniors"
                                      ]
                                    };
                                    setMessages([resetMsg]);
                                  } else {
                                    handleSuggestionClick(suggestion);
                                  }
                                }}
                                variant="outline"
                                size="sm"
                                className="text-xs h-auto py-2 px-3 hover:bg-primary/10 hover:border-primary transition-all group hover:scale-105 duration-200"
                              >
                                <span className="mr-1 group-hover:animate-bounce">{emoji}</span>
                                {suggestion}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area - Fixed at Bottom */}
      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          {/* Action Buttons */}
          {showStartAnalysisButton && isRefinementMode && !isAnalyzing && !showDashboard && (
            <div className="flex items-center justify-between mb-3 p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <BarChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {analysisProgress > 0 && analysisProgress < 100 ? 'Ready to re-analyze?' : 'Ready to analyze?'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {analysisProgress === 100 ? 'Re-run analysis with your refined idea' : 'Run comprehensive PM-Fit analysis when you\'re ready'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => startAnalysis()}
                className="gap-2 shadow-lg"
                size="sm"
              >
                <Play className="h-4 w-4" />
                {analysisProgress === 100 ? 'Re-analyze Idea' : 'Start Analysis'}
              </Button>
            </div>
          )}
          
          {/* Current Idea Display */}
          {currentIdea && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg">
              <Badge variant="secondary" className="text-xs">
                Current Idea
              </Badge>
              <span className="text-sm text-muted-foreground truncate">
                {currentIdea}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={
                !currentIdea 
                  ? "Describe your product idea..." 
                  : isAnalyzing 
                    ? "Type your answer..." 
                    : "Ask a follow-up question..."
              }
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
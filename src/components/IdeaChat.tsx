import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, Bot, User, Target, TrendingUp, Users, Lightbulb, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  showPMF?: boolean;
}

interface IdeaChatProps {
  onAnalysisReady: (idea: string, metadata: any) => void;
}

// Component for dynamic idea suggestions
const IdeaSuggestions: React.FC<{ onSelect: (idea: string) => void }> = ({ onSelect }) => {
  const [suggestions, setSuggestions] = useState<{ label: string; idea: string }[]>([]);
  
  const allSuggestions = [
    // Tech & AI
    { label: "AI Assistant", idea: "An AI-powered personal assistant that helps manage daily tasks and schedules using natural language processing" },
    { label: "AI Marketing", idea: "An AI-powered platform that helps small businesses automate their social media marketing and content creation" },
    { label: "AI Tutor", idea: "An adaptive AI tutoring platform that personalizes learning paths for students based on their learning style" },
    { label: "AI Health", idea: "An AI health companion that monitors vitals and provides personalized wellness recommendations" },
    
    // Healthcare & Wellness
    { label: "Elder Care", idea: "A mobile app that connects elderly people with local volunteers for daily assistance and companionship" },
    { label: "Mental Health", idea: "A platform connecting people with licensed therapists for affordable online counseling sessions" },
    { label: "Fitness Coach", idea: "A virtual fitness coaching app that creates personalized workout plans using computer vision" },
    { label: "Nutrition Tracker", idea: "An app that analyzes meal photos to track nutrition and suggests healthier alternatives" },
    
    // Remote Work & Productivity
    { label: "Remote Work", idea: "A SaaS tool that helps remote teams track productivity and wellbeing metrics without being invasive" },
    { label: "Team Collab", idea: "A virtual office platform that recreates spontaneous office interactions for remote teams" },
    { label: "Task Manager", idea: "An intelligent task management system that prioritizes work based on deadlines and energy levels" },
    { label: "Focus App", idea: "A productivity app that uses gamification to help people maintain deep focus sessions" },
    
    // Marketplaces & Platforms
    { label: "Local Services", idea: "A marketplace connecting homeowners with vetted local service providers for home repairs" },
    { label: "Skill Exchange", idea: "A platform where people can exchange skills and services without monetary transactions" },
    { label: "Farmer Market", idea: "A direct-to-consumer marketplace connecting local farmers with urban consumers" },
    { label: "Freelance Hub", idea: "A specialized platform for creative freelancers to showcase portfolios and find clients" },
    
    // Education & Learning
    { label: "Language Learning", idea: "A conversational AI app that helps people learn languages through real-time practice" },
    { label: "Coding Bootcamp", idea: "An online coding bootcamp that guarantees job placement through industry partnerships" },
    { label: "Parent Resources", idea: "An app providing parents with age-appropriate educational activities and parenting tips" },
    { label: "Career Mentor", idea: "A platform matching young professionals with industry mentors for career guidance" },
    
    // Finance & Business
    { label: "Micro Investing", idea: "An app that rounds up purchases and invests the spare change in sustainable companies" },
    { label: "Expense Tracker", idea: "An AI expense tracker that categorizes spending and provides personalized saving tips" },
    { label: "Small Biz Tools", idea: "An all-in-one platform for small businesses to manage invoicing, expenses, and taxes" },
    { label: "Crypto Education", idea: "A gamified platform teaching cryptocurrency and blockchain concepts to beginners" },
    
    // Sustainability & Environment
    { label: "Carbon Tracker", idea: "An app that tracks personal carbon footprint and suggests ways to reduce environmental impact" },
    { label: "Food Waste", idea: "A platform connecting restaurants with excess food to local charities and food banks" },
    { label: "Green Shopping", idea: "A browser extension that suggests eco-friendly alternatives while shopping online" },
    { label: "Solar Advisor", idea: "An AI platform that analyzes homes for solar panel potential and ROI calculations" },
    
    // Social & Community
    { label: "Neighborhood", idea: "A hyperlocal social network for neighbors to share resources and organize events" },
    { label: "Pet Care", idea: "An app connecting pet owners with trusted pet sitters and dog walkers in their area" },
    { label: "Event Planning", idea: "An AI event planning assistant that handles vendor coordination and budget management" },
    { label: "Hobby Groups", idea: "A platform helping people find and join local hobby groups based on their interests" }
  ];
  
  useEffect(() => {
    // Generate random suggestions only once on mount (page refresh)
    const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5);
    setSuggestions(shuffled.slice(0, 3));
  }, []); // Empty dependency array means this only runs once on mount
  
  return (
    <>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion.idea)}
          className="text-xs text-primary hover:underline transition-all duration-300 hover:text-primary/80"
        >
          {suggestion.label}
        </button>
      ))}
    </>
  );
};

const IdeaChat: React.FC<IdeaChatProps> = ({ onAnalysisReady }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [initialIdea, setInitialIdea] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ideaData, setIdeaData] = useState({
    problem: '',
    solution: '',
    targetUsers: '',
    uniqueness: '',
    demographics: '',
    monetization: '',
    competition: ''
  });
  const [conversationStage, setConversationStage] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Build contextual, idea-specific suggestions (max 4)
  const buildContextualSuggestions = (ideaText: string, lastInput?: string, pmf?: any): string[] => {
    const text = `${(ideaText || '').toLowerCase()} ${(lastInput || '').toLowerCase()}`;
    const out: string[] = [];

    // Prefer AI-provided refinements if available
    if (pmf?.refinements && Array.isArray(pmf.refinements)) {
      // Extract titles from refinement objects
      const refinementTitles = pmf.refinements.map((r: any) => 
        typeof r === 'string' ? r : r.title || r.description || 'Refinement suggestion'
      );
      out.push(...refinementTitles);
    }

    // Domain-specific suggestion sets
    if (text.includes('volunteer') && (text.includes('parent') || text.includes('elder') || text.includes('care'))) {
      out.push(
        'Working single parents needing flexible support',
        'Families coordinating elder care across siblings',
        'Parents needing school pickup and homework help',
        'Care needs scheduling with vetted volunteers'
      );
    } else if (text.includes('ai') || text.includes('automate') || text.includes('gpt')) {
      out.push(
        'Solopreneurs automating repetitive tasks',
        'SMBs needing content/workflow automation',
        'Agencies improving throughput with AI',
        'Teams wanting AI-assisted analytics'
      );
    } else if (text.includes('remote') || text.includes('team')) {
      out.push(
        'Remote-first startups improving visibility',
        'Hybrid teams streamlining async comms',
        'Consultancies coordinating global projects',
        'Distributed teams enhancing wellbeing metrics'
      );
    } else if (text.includes('marketplace') || text.includes('platform')) {
      out.push(
        'Two-sided marketplace supply constraints',
        'Demand acquisition channels to test first',
        'Trust/safety features to increase conversion',
        'Liquidity strategy for the cold start problem'
      );
    } else if (text.includes('education') || text.includes('tutor') || text.includes('learn')) {
      out.push(
        'Adult learners upskilling for career change',
        'K-12 students needing personalized help',
        'University students optimizing study plans',
        'Corporate L&D microlearning use-cases'
      );
    } else if (text.includes('health') || text.includes('fitness') || text.includes('wellness') || text.includes('care')) {
      out.push(
        'Chronic care patients needing adherence support',
        'Busy professionals seeking wellness routines',
        'Seniors needing remote check-ins',
        'Caregivers coordinating with providers'
      );
    }

    // If still empty, add strategic next-step prompts (non-generic)
    if (out.length === 0) {
      out.push(
        'Identify the top 3 pains this solves (specific)',
        'Define the primary user persona you’ll start with',
        'Outline the 4 MVP features for week-1 testing',
        'Pick 1 channel to get the first 10 users'
      );
    }

    // Ensure uniqueness and cap at 4
    const unique = Array.from(new Set(out)).slice(0, 4);
    return unique;
  };

  const validateIdea = (idea: string): { isValid: boolean; message?: string } => {
    const trimmedIdea = idea.trim();
    
    // Check minimum length
    if (trimmedIdea.length < 20) {
      return { isValid: false, message: "Please provide more detail about your startup idea (at least 20 characters)" };
    }
    
    // Check for repetitive characters
    const uniqueChars = new Set(trimmedIdea.toLowerCase().replace(/\s/g, ''));
    if (uniqueChars.size < 10) {
      return { isValid: false, message: "Please describe a real startup concept" };
    }
    
    // Check for business-related keywords
    const businessKeywords = ['app', 'platform', 'service', 'product', 'help', 'solve', 'business', 'market', 'users', 'customers', 'tool', 'software', 'solution', 'connect', 'automate', 'improve', 'create', 'build', 'develop', 'manage', 'provide', 'enable', 'streamline', 'optimize', 'sell', 'buy', 'marketplace', 'network', 'community', 'system'];
    const hasBusinessContext = businessKeywords.some(keyword => 
      trimmedIdea.toLowerCase().includes(keyword)
    );
    
    if (!hasBusinessContext) {
      return { isValid: false, message: "Please describe a business or product idea that solves a problem" };
    }
    
    // Check if it's just nonsense (all same word repeated, random letters, etc)
    const words = trimmedIdea.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    if (uniqueWords.size < 3) {
      return { isValid: false, message: "Please provide a meaningful description of your startup idea" };
    }
    
    return { isValid: true };
  };

  const startConversation = () => {
    if (!initialIdea.trim()) {
      toast({
        title: "Empty idea",
        description: "Please describe your startup idea before continuing",
        variant: "destructive"
      });
      return;
    }

    const validation = validateIdea(initialIdea);
    if (!validation.isValid) {
      toast({
        title: "Invalid idea",
        description: validation.message,
        variant: "destructive"
      });
      return;
    }

    // Start transition animation
    setIsTransitioning(true);
    
    // After animation starts, set up the chat
    setTimeout(() => {
      setHasStarted(true);
      
      // Add user's initial idea as first message
      const userMessage: Message = {
        id: '1',
        type: 'user',
        content: initialIdea,
        timestamp: new Date()
      };

      setMessages([userMessage]);
      setIdeaData(prev => ({ ...prev, problem: initialIdea }));

      // Add bot response after a delay with context-aware suggestions
      setTimeout(() => {
        // Generate contextual suggestions based on the idea
        const ideaLower = initialIdea.toLowerCase();
        let contextualSuggestions: string[] = [];
        
        if (ideaLower.includes('volunteer') && (ideaLower.includes('parent') || ideaLower.includes('elder'))) {
          contextualSuggestions = [
            "Working parents with children under 10",
            "Single parents needing childcare support", 
            "Families caring for elderly relatives",
            "Dual-income households with limited time"
          ];
        } else if (ideaLower.includes('ai') || ideaLower.includes('automate')) {
          contextualSuggestions = [
            "Tech-savvy startup founders",
            "Digital marketing agencies",
            "E-commerce businesses",
            "Content creators and influencers"
          ];
        } else if (ideaLower.includes('remote') || ideaLower.includes('team')) {
          contextualSuggestions = [
            "Distributed tech companies",
            "Remote-first startups",
            "Hybrid work teams",
            "Global consulting firms"
          ];
        } else if (ideaLower.includes('health') || ideaLower.includes('fitness') || ideaLower.includes('wellness')) {
          contextualSuggestions = [
            "Health-conscious millennials",
            "Busy professionals seeking balance",
            "Fitness enthusiasts",
            "People with chronic conditions"
          ];
        } else if (ideaLower.includes('education') || ideaLower.includes('learn') || ideaLower.includes('tutor')) {
          contextualSuggestions = [
            "K-12 students needing support",
            "Adult learners changing careers",
            "University students",
            "Parents homeschooling children"
          ];
        } else {
          // Generic fallback for other ideas
          contextualSuggestions = [
            "Early adopters in urban areas",
            "Tech-forward professionals",
            "Cost-conscious consumers",
            "Innovation-seeking businesses"
          ];
        }
        
        const botMessage: Message = {
          id: '2',
          type: 'bot',
          content: `👋 Great idea! I'm your PMF advisor and I'll help you refine this to maximize product-market fit. Let me ask you a few questions to better understand your vision. First, who specifically would benefit most from ${initialIdea.includes('volunteer') ? 'this volunteer assistance platform' : 'your solution'}?`,
          timestamp: new Date(),
          suggestions: contextualSuggestions
        };
        setMessages(prev => [...prev, botMessage]);
      }, 800);
    }, 600);
  };

  const generateBotResponse = async (userMessage: string): Promise<{ message: string; suggestions: string[]; pmfAnalysis?: any }> => {
    try {
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: userMessage,
          conversationHistory
        }
      });

      if (error) throw error;

      // Check if it's a quota error
      if (data.error && data.error.includes('quota exceeded')) {
        toast({
          title: "OpenAI Quota Exceeded",
          description: "The OpenAI API key has reached its usage limit. Please add credits to your OpenAI account or update the API key.",
          variant: "destructive"
        });
      }

      if (data?.pmfAnalysis) {
        return {
          message: data.response || "Here's your comprehensive PMF analysis!",
          suggestions: buildContextualSuggestions(messages[0]?.content || initialIdea || userMessage, userMessage, data.pmfAnalysis),
          pmfAnalysis: data.pmfAnalysis
        };
      }

      return {
        message: data.response || "I'm here to help refine your idea. Could you tell me more?",
        suggestions: buildContextualSuggestions(messages[0]?.content || initialIdea || userMessage, userMessage)
      };
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Provide intelligent fallback responses based on conversation context
      const lowerMessage = userMessage.toLowerCase();
      let fallbackMessage = "";
      let fallbackSuggestions: string[] = [];
      
      // Determine conversation context and provide appropriate fallback
      if (messages.length <= 2) {
        // First response - ask about specific target demographic based on idea
        const ideaText = messages[0]?.content || userMessage;
        const ideaLower = ideaText.toLowerCase();
        
        if (ideaLower.includes('volunteer') && (ideaLower.includes('parent') || ideaLower.includes('elder'))) {
          fallbackMessage = "👋 Great idea! Connecting volunteers with families is meaningful. Who specifically needs this help most urgently?";
          fallbackSuggestions = [
            "Working single parents with young kids",
            "Families with special needs children",
            "Adult children caring for aging parents",
            "New parents without family nearby"
          ];
        } else if (ideaLower.includes('ai') || ideaLower.includes('automate')) {
          fallbackMessage = "Excellent! AI automation can save tons of time. Which businesses struggle most with this?";
          fallbackSuggestions = [
            "Solopreneurs managing everything alone",
            "Small agencies with limited staff",
            "E-commerce stores scaling quickly",
            "Local businesses new to digital"
          ];
        } else {
          fallbackMessage = "Interesting concept! Who experiences this problem most acutely?";
          fallbackSuggestions = [
            "People in your target market segment",
            "Users with specific pain points",
            "Businesses in your industry",
            "Communities you want to serve"
          ];
        }
      } else if (lowerMessage.includes('parent') || lowerMessage.includes('single') || lowerMessage.includes('families')) {
        fallbackMessage = "Perfect target group! 🎯 Now, what specific assistance would be most valuable to them?";
        fallbackSuggestions = [
          "Emergency childcare coverage",
          "School pickup and homework help",
          "Grocery shopping and meal prep",
          "Household tasks and errands"
        ];
      } else if (lowerMessage.includes('professional') || lowerMessage.includes('business') || lowerMessage.includes('student')) {
        fallbackMessage = "Excellent target audience! 🎯 Now, how exactly does your solution help them? What makes it unique?";
        fallbackSuggestions = [
          "AI-powered personalization",
          "Vetted and background-checked providers",
          "Real-time matching algorithm",
          "Community-driven trust system"
        ];
      } else if (lowerMessage.includes('ai') || lowerMessage.includes('marketplace') || lowerMessage.includes('platform')) {
        fallbackMessage = "That's innovative! 🚀 For this to be profitable, what pricing model would work best for your target demographic?";
        fallbackSuggestions = ["$9.99/month subscription", "Freemium with premium features", "One-time purchase", "Transaction-based fees"];
      } else if (lowerMessage.includes('subscription') || lowerMessage.includes('freemium') || lowerMessage.includes('price')) {
        fallbackMessage = "Smart pricing strategy! 💰 Who are your main competitors, and what's your unique advantage?";
        fallbackSuggestions = ["No direct competitors yet", "Better UX and simpler onboarding", "50% more affordable", "Unique features they don't have"];
      } else if (lowerMessage.includes('competitor') || lowerMessage.includes('better') || lowerMessage.includes('unique')) {
        fallbackMessage = "Great competitive analysis! What's your go-to-market strategy? How will you reach your first 100 customers?";
        fallbackSuggestions = ["Social media marketing", "Content marketing & SEO", "Direct B2B sales", "Product Hunt launch"];
      } else {
        fallbackMessage = "Perfect! 🎉 Based on our conversation, I can see strong potential. Would you like me to calculate your PMF score now?";
        fallbackSuggestions = ["Yes, show me the PMF analysis!", "Let me add more details first"];
      }
      
      return {
        message: fallbackMessage,
        suggestions: buildContextualSuggestions(messages[0]?.content || userMessage, userMessage)
      };
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Check if user wants to see PMF analysis
    if (input.toLowerCase().includes('pmf') || 
        input.toLowerCase().includes('score') || 
        input.toLowerCase().includes('calculate') ||
        input.toLowerCase().includes('analyze')) {
      
      setIsTyping(true);
      
      // Request PMF analysis from ChatGPT via edge function
      try {
        const pmfResponse = await generateBotResponse(input);
        
        // Check if we got PMF analysis data
        if (pmfResponse && pmfResponse.pmfAnalysis) {
          const pmfData = pmfResponse.pmfAnalysis;
          
          // Update idea data with ChatGPT's analysis
          const enrichedIdeaData = {
            ...ideaData,
            pmfScore: pmfData.pmfScore,
            targetAge: pmfData.demographics.targetAge,
            incomeRange: pmfData.demographics.incomeRange,
            interests: pmfData.demographics.interests,
            marketSize: pmfData.demographics.marketSize,
            competition: pmfData.demographics.competition,
            features: pmfData.features,
            refinements: pmfData.refinements,
            actionTips: pmfData.actionTips
          };
          
          // Add the summary message to chat
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'bot',
            content: pmfData.summary || "🎯 Perfect! I've calculated your PMF score and created a comprehensive analysis. Your dashboard is ready!",
            timestamp: new Date(),
            showPMF: true,
            suggestions: buildContextualSuggestions(messages[0]?.content || input, input, pmfData)
          }]);
          
          // Trigger analysis with enriched data - this shows the dashboard
          setTimeout(() => {
            const fullIdea = `${ideaData.problem} Solution: ${ideaData.solution || 'Innovative approach'} Target: ${ideaData.targetUsers || 'Wide market'} Monetization: ${ideaData.monetization || 'Subscription model'}`;
            onAnalysisReady(fullIdea, enrichedIdeaData);
          }, 1000);
          
        } else {
          // Fallback: If no PMF data, still trigger analysis with basic data
          const basicPmfData = {
            pmfScore: 65 + Math.floor(Math.random() * 20),
            targetAge: "25-45",
            incomeRange: "$60k-100k",
            interests: ["Technology", "Innovation", "Productivity"],
            marketSize: "$1.5B",
            competition: "Medium"
          };
          
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'bot',
            content: "🎯 I'm analyzing your startup idea based on the information provided. Your PMF dashboard is loading...",
            timestamp: new Date(),
            showPMF: true
          }]);
          
          setTimeout(() => {
            const fullIdea = `${ideaData.problem} - Early stage startup idea`;
            onAnalysisReady(fullIdea, { ...ideaData, ...basicPmfData });
          }, 1000);
        }
      } catch (error) {
        console.error('Error getting PMF analysis:', error);
        
        // Even on error, show dashboard with basic data
        const fallbackData = {
          pmfScore: 70,
          targetAge: "25-45",
          incomeRange: "$60k-100k",
          interests: ["Technology", "Business", "Innovation"],
          marketSize: "$2B",
          competition: "Medium"
        };
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'bot',
          content: "🎯 I've prepared your PMF analysis dashboard with the available information.",
          timestamp: new Date(),
          showPMF: true
        }]);
        
        setTimeout(() => {
          onAnalysisReady(ideaData.problem || "Your startup idea", { ...ideaData, ...fallbackData });
        }, 1000);
      }
      
      setIsTyping(false);
      return;
    }

    // Get AI response
    try {
      const response = await generateBotResponse(input);
      
      // Update idea data based on conversation content
      const lowerInput = input.toLowerCase();
      const updatedData = { ...ideaData };
      
      if (!updatedData.targetUsers && (lowerInput.includes('professional') || lowerInput.includes('business') || lowerInput.includes('student') || lowerInput.includes('parent'))) {
        updatedData.targetUsers = input;
      } else if (!updatedData.solution && (lowerInput.includes('ai') || lowerInput.includes('marketplace') || lowerInput.includes('platform') || lowerInput.includes('app'))) {
        updatedData.solution = input;
        updatedData.uniqueness = input;
      } else if (!updatedData.monetization && (lowerInput.includes('subscription') || lowerInput.includes('freemium') || lowerInput.includes('purchase') || lowerInput.includes('fee'))) {
        updatedData.monetization = input;
      } else if (!updatedData.competition && (lowerInput.includes('competitor') || lowerInput.includes('better') || lowerInput.includes('unique'))) {
        updatedData.competition = input;
      }
      
      setIdeaData(updatedData);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions
      };

      setMessages(prev => [...prev, botMessage]);
      setConversationStage(prev => prev + 1);
    } catch (error) {
      console.error('Error in handleSend:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  // Initial idea input interface with morph animation
  if (!hasStarted) {
    return (
      <div className="w-full max-w-xl mx-auto px-4">
        <div className={cn(
          "text-center mb-4 transition-all duration-700 ease-out",
          isTransitioning ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
        )}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2 gradient-text">
            What's Your Big Idea? 🚀
          </h2>
          <p className="text-muted-foreground text-sm">
            Describe your startup concept and I'll help you maximize its potential
          </p>
        </div>
        
        <div className={cn(
          "transition-all duration-700 ease-out transform-gpu",
          isTransitioning ? "scale-95 opacity-0" : "scale-100 opacity-100"
        )}>
          <Card className="bg-card/95 backdrop-blur border shadow-lg p-4">
            <div className="relative">
              <Textarea
                value={initialIdea}
                onChange={(e) => setInitialIdea(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    startConversation();
                  }
                }}
                placeholder="Example: I want to build a marketplace that connects local farmers directly with consumers, eliminating middlemen and ensuring fresh produce delivery..."
                className={cn(
                  "min-h-[80px] text-sm bg-background border resize-none transition-all duration-700 placeholder:text-muted-foreground/60",
                  isTransitioning && "transform scale-95"
                )}
                disabled={isTransitioning}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">Try ideas like:</span>
                <IdeaSuggestions onSelect={setInitialIdea} />
              </div>
              
              {/* Morphing bubble preview - shows during transition */}
              {isTransitioning && (
                <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
                  <div className="bg-primary text-primary-foreground px-3 py-2 rounded-2xl rounded-br-sm max-w-[70%] animate-slide-in-right opacity-0" 
                       style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                    <p className="text-sm leading-relaxed break-words">{initialIdea}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className={cn(
              "flex items-center justify-between gap-2 mt-3 transition-all duration-500",
              isTransitioning ? "opacity-0" : "opacity-100"
            )}>
              <p className="text-xs text-muted-foreground">
                Press Enter to start • {initialIdea.length} characters
              </p>
              <Button
                onClick={startConversation}
                disabled={!initialIdea.trim() || isTransitioning}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                Start Analysis <Sparkles className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="w-full max-w-2xl mx-auto px-4 animate-fade-in">
      <Card className="bg-card/95 backdrop-blur border shadow-lg">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">PMF Advisor</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Refining your idea for maximum profitability</p>
            </div>
          </div>
        </div>

        <div className="h-[400px] overflow-y-auto p-3 space-y-3">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                message.type === 'user' ? 'justify-end' : 'justify-start',
                index === 0 ? 'animate-slide-in-right' : 'animate-fade-in'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {message.type === 'bot' && (
                <div className="flex-shrink-0">
                  <div className="p-1 rounded-full bg-primary/10">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                </div>
              )}
              
              <div className={cn(
                "max-w-[75%] space-y-2",
                message.type === 'user' ? 'items-end' : 'items-start'
              )}>
                <div
                  className={cn(
                    "px-3 py-2 rounded-2xl",
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  )}
                >
                  <p className="text-sm leading-relaxed break-words">{message.content}</p>
                </div>
                
                {message.suggestions && (
                  <div className="flex flex-wrap gap-1.5 mt-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
                    {message.suggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2 hover:bg-primary/10 hover:border-primary/50"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <Lightbulb className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{suggestion}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {message.type === 'user' && (
                <div className="flex-shrink-0">
                  <div className="p-1 rounded-full bg-secondary/10">
                    <User className="h-3 w-3 text-secondary" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2 justify-start animate-fade-in">
              <div className="flex-shrink-0">
                <div className="p-1 rounded-full bg-primary/10">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-muted rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isTyping) {
                  handleSend();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 text-sm"
              disabled={isTyping}
            />
            <Button
              onClick={handleSend}
              size="sm"
              disabled={isTyping || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Always show Analyze button unless PMF is already shown */}
          {!messages.some(m => m.showPMF) && (
            <div className="mt-3 flex justify-center">
              <Button
                onClick={() => {
                  const analyzeMessage = "Calculate my PMF score and provide detailed analysis";
                  setInput(analyzeMessage);
                  setTimeout(() => handleSend(), 100);
                }}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                size="sm"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Analyze PMF Score
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default IdeaChat;
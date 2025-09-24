import { useState, useEffect } from "react";
import IdeaInput from "@/components/IdeaInput";
import GuidedIdeaInput from "@/components/GuidedIdeaInput";
import RefinementControls from "@/components/RefinementControls";
import PMFDashboard from "@/components/PMFDashboard";
import DemographicsAnalysis from "@/components/DemographicsAnalysis";
import FeatureChecklist from "@/components/FeatureChecklist";
import ActionTips from "@/components/ActionTips";
import CollaborationHub from "@/components/CollaborationHub";
import RealTimeRefinementChart from "@/components/RealTimeRefinementChart";
import Auth from "@/components/Auth";
import PaywallOverlay from "@/components/PaywallOverlay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Rocket, Sparkles, RefreshCw, LogOut, Save, Loader2, Database, Crown, ArrowRight, ArrowLeft, CheckCircle2, Brain, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [idea, setIdea] = useState("");
  const [ideaMetadata, setIdeaMetadata] = useState<any>(null);
  const [showGuidedInput, setShowGuidedInput] = useState(true);
  const [pmfScore, setPmfScore] = useState(0);
  const [refinements, setRefinements] = useState({
    budget: "bootstrapped",
    market: "niche",
    timeline: "mvp",
  });
  const [saving, setSaving] = useState(false);
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Idea, 2: Calculating, 3: Dashboard
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subscription, canAccess, getRemainingIdeas, incrementIdeaCount } = useSubscription();

  useEffect(() => {
    // Check current auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Load existing ideas when user logs in
    if (user) {
      loadLatestIdea();
    } else {
      // Clear data when user logs out
      setIdeaId(null);
      handleReset();
    }
  }, [user]);

  const loadLatestIdea = async () => {
    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setIdea(data.original_idea || "");
      setIdeaId(data.id);
      setPmfScore(data.pmf_score || 0);
      // Load refinements if they exist
      if (data.market_size) {
        setRefinements({
          budget: data.competition || "bootstrapped",
          market: data.market_size || "niche",
          timeline: "mvp", // This isn't stored in DB yet
        });
      }
      // If we have a saved idea, show the dashboard
      if (data.original_idea) {
        setCurrentStep(3);
      }
    }
  };

  const handleIdeaSubmit = async (ideaText: string, metadata: any) => {
    setIdea(ideaText);
    setIdeaMetadata(metadata);
    setShowGuidedInput(false);
    
    // Auto-adjust refinements based on metadata
    if (metadata.targetUsers === 'enterprise') {
      setRefinements(prev => ({ ...prev, market: 'enterprise', budget: 'funded' }));
    } else if (metadata.targetUsers === 'consumers') {
      setRefinements(prev => ({ ...prev, market: 'mass' }));
    }

    // Move to calculating step
    setCurrentStep(2);
    setIsCalculating(true);

    // Simulate calculation process
    setTimeout(() => {
      setIsCalculating(false);
      setCurrentStep(3);
      toast({
        title: "Analysis Complete",
        description: "Your startup idea has been analyzed successfully",
      });
    }, 3000);
  };

  const saveIdea = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save your ideas",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    // Extract keywords from the idea or use metadata tags
    const keywords = ideaMetadata?.tags || idea.toLowerCase().split(' ')
      .filter(word => word.length > 4)
      .slice(0, 5);
    
    const ideaData = {
      user_id: user.id,
      original_idea: idea,
      pmf_score: pmfScore,
      market_size: refinements.market,
      competition: refinements.budget,
      category: ideaMetadata?.targetUsers || refinements.market,
      keywords: keywords,
      is_public: true,
      target_age: ideaMetadata?.targetUsers || null,
      interests: ideaMetadata?.tags || []
    };

    if (ideaId) {
      // Update existing idea
      const { error } = await supabase
        .from("ideas")
        .update(ideaData)
        .eq("id", ideaId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update idea",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Saved",
          description: "Your idea has been updated",
        });
      }
    } else {
      // Create new idea
      const { data, error } = await supabase
        .from("ideas")
        .insert(ideaData)
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save idea",
          variant: "destructive",
        });
      } else {
        setIdeaId(data.id);
        toast({
          title: "Saved",
          description: "Your idea has been saved",
        });
      }
    }
    
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
  };

  const handleRefinementChange = (key: string, value: string) => {
    setRefinements(prev => ({ ...prev, [key]: value }));
  };

  const handleRefinementSuggestion = (suggestion: string) => {
    toast({
      title: "Refinement Suggestion Applied",
      description: suggestion,
    });
  };

  const handleReset = () => {
    setIdea("");
    setRefinements({
      budget: "bootstrapped",
      market: "niche",
      timeline: "mvp",
    });
    setPmfScore(0);
    setIdeaId(null);
    setCurrentStep(1);
  };

  // Show auth screen if not logged in
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 opacity-30" style={{ background: 'var(--gradient-mesh)' }} />
      <div className="fixed inset-0 animate-glow opacity-20" />

      {/* Header */}
      <header className="relative glass-panel border-b border-white/5 z-10">
        <div className="container-fluid">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 glass-button animate-float">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-semibold gradient-text">PMF Validator</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block px-3 py-1 glass-panel rounded-full">
                {user.email}
              </span>
              <div className="flex items-center gap-2">
                {currentStep === 3 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={saveIdea}
                      disabled={saving || !idea}
                      title="Save"
                      className="glass-button hover:animate-glow"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleReset}
                      title="New Idea"
                      className="glass-button hover:animate-glow"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="glass-button hover:animate-glow"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="container-fluid mt-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {[
              { step: 1, label: "Describe Idea", icon: Brain },
              { step: 2, label: "Analyzing", icon: Target },
              { step: 3, label: "Results", icon: TrendingUp }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center flex-1">
                <div className={`flex flex-col items-center ${index < 2 ? 'flex-1' : ''}`}>
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500
                    ${currentStep >= item.step 
                      ? 'bg-primary text-primary-foreground animate-glow' 
                      : 'glass-panel text-muted-foreground'
                    }
                  `}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={`
                    text-xs mt-2 transition-all duration-500
                    ${currentStep >= item.step ? 'text-primary' : 'text-muted-foreground'}
                  `}>
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <div className={`
                    flex-1 h-0.5 mx-4 transition-all duration-500
                    ${currentStep > item.step ? 'bg-primary' : 'bg-muted'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container-fluid py-8 relative z-10">
        {/* Step 1: Idea Input */}
        {currentStep === 1 && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 gradient-text">
                What's Your Big Idea?
              </h2>
              <p className="text-muted-foreground text-lg">
                Describe your startup concept and we'll analyze its market potential
              </p>
            </div>
            
            <div className="glass-card p-8">
              {showGuidedInput ? (
                <GuidedIdeaInput onSubmit={handleIdeaSubmit} value={idea} />
              ) : (
                <>
                  <IdeaInput value={idea} onChange={setIdea} />
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowGuidedInput(true)}
                    className="w-full mt-4 glass-button"
                  >
                    Use Guided Input
                  </Button>
                  <Button
                    onClick={() => handleIdeaSubmit(idea, {})}
                    disabled={!idea}
                    className="w-full mt-4"
                  >
                    Analyze Idea <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Calculating */}
        {currentStep === 2 && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="glass-card p-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 glass-panel rounded-full flex items-center justify-center animate-glow">
                  <Brain className="w-12 h-12 text-primary animate-pulse" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4 gradient-text">
                Analyzing Your Idea
              </h3>
              <p className="text-muted-foreground mb-8">
                Our AI is evaluating market potential, competition, and product-market fit...
              </p>
              <Progress value={66} className="w-full max-w-md mx-auto animate-pulse" />
              
              <div className="grid grid-cols-3 gap-4 mt-12">
                {["Market Analysis", "Competition Check", "PMF Score"].map((item, i) => (
                  <div key={item} className="glass-panel p-4 rounded-lg">
                    <CheckCircle2 className={`w-5 h-5 mx-auto mb-2 ${i < 2 ? 'text-success' : 'text-muted-foreground animate-pulse'}`} />
                    <p className="text-xs text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Dashboard */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold gradient-text">
                  Your Startup Analysis
                </h2>
                <p className="text-muted-foreground mt-2">
                  Real-time insights and recommendations for your idea
                </p>
              </div>
              <Button
                onClick={handleReset}
                variant="outline"
                className="glass-button"
              >
                <ArrowLeft className="mr-2 w-4 h-4" /> New Idea
              </Button>
            </div>

            {/* Responsive Grid Layout */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {/* Analytics Section */}
              <div className="space-y-6 lg:col-span-1">
                <div className="glass-card p-6 card-hover">
                  <PMFDashboard 
                    idea={idea} 
                    refinements={refinements} 
                    onScoreUpdate={setPmfScore}
                  />
                </div>
                <div className="glass-card p-6 card-hover">
                  <RealTimeRefinementChart
                    idea={idea}
                    pmfScore={pmfScore}
                    refinements={refinements}
                    onRefinementSuggestion={handleRefinementSuggestion}
                  />
                </div>
              </div>

              {/* Controls & Demographics */}
              <div className="space-y-6 lg:col-span-1">
                <div className="glass-card p-6 card-hover">
                  <RefinementControls refinements={refinements} onChange={handleRefinementChange} />
                </div>
                <div className="glass-card p-6 card-hover">
                  <DemographicsAnalysis idea={idea} market={refinements.market} />
                </div>
                <div className="glass-card p-6 card-hover">
                  <ActionTips score={pmfScore} />
                </div>
              </div>

              {/* Features & Collaboration */}
              <div className="space-y-6 lg:col-span-1 xl:col-span-1 lg:col-span-2 xl:col-span-1">
                <div className="glass-card p-6 card-hover">
                  <FeatureChecklist idea={idea} budget={refinements.budget} />
                </div>
                <div className="glass-card p-6 card-hover">
                  <CollaborationHub 
                    currentIdea={idea}
                    currentCategory={refinements.market}
                    currentKeywords={[]}
                    userId={user.id}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
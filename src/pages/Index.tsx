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
import { Rocket, Sparkles, RefreshCw, LogOut, Save, Loader2, Database, Crown } from "lucide-react";
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
    }
  };

  const handleIdeaSubmit = (ideaText: string, metadata: any) => {
    setIdea(ideaText);
    setIdeaMetadata(metadata);
    setShowGuidedInput(false);
    
    // Auto-adjust refinements based on metadata
    if (metadata.targetUsers === 'enterprise') {
      setRefinements(prev => ({ ...prev, market: 'enterprise', budget: 'funded' }));
    } else if (metadata.targetUsers === 'consumers') {
      setRefinements(prev => ({ ...prev, market: 'mass' }));
    }
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
  };

  // Show auth screen if not logged in
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/30 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Rocket className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold gradient-text">PMF Validator</h1>
                <p className="text-xs text-muted-foreground">Product-Market Fit Analysis Tool</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1">
                {user.email}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={saveIdea}
                disabled={saving || !idea}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-2 hover:bg-destructive/10 hover:border-destructive"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8 animate-slide-up">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered Validation
            </Badge>
            <h2 className="text-4xl font-display font-bold mb-3">
              Validate Your <span className="gradient-text">Startup Idea</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get instant Product-Market Fit analysis with AI-driven insights, demographic targeting, 
              and actionable recommendations to refine your startup concept.
            </p>
          </div>

          {/* Main Grid Layout */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Input & Controls */}
            <div className="lg:col-span-1 space-y-6">
              {showGuidedInput ? (
                <GuidedIdeaInput onSubmit={handleIdeaSubmit} value={idea} />
              ) : (
                <>
                  <IdeaInput value={idea} onChange={setIdea} />
                  <Button 
                    variant="outline" 
                    onClick={() => setShowGuidedInput(true)}
                    className="w-full"
                  >
                    Use Guided Input
                  </Button>
                </>
              )}
              <RefinementControls refinements={refinements} onChange={handleRefinementChange} />
              <RealTimeRefinementChart
                idea={idea}
                pmfScore={pmfScore}
                refinements={refinements}
                onRefinementSuggestion={handleRefinementSuggestion}
              />
            </div>

            {/* Middle Column - Dashboard & Demographics */}
            <div className="lg:col-span-1 space-y-6">
              <PMFDashboard 
                idea={idea} 
                refinements={refinements} 
                onScoreUpdate={setPmfScore}
              />
              <DemographicsAnalysis idea={idea} market={refinements.market} />
            </div>

            {/* Right Column - Features, Actions & Collaboration */}
            <div className="lg:col-span-1 space-y-6">
              <FeatureChecklist idea={idea} budget={refinements.budget} />
              <ActionTips score={pmfScore} />
              <CollaborationHub 
                currentIdea={idea}
                currentCategory={refinements.market}
                currentKeywords={[]}
                userId={user.id}
              />
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-border/50">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Your ideas are automatically saved to your account
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default Index;
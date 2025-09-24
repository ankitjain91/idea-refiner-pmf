import { useState } from "react";
import IdeaInput from "@/components/IdeaInput";
import RefinementControls from "@/components/RefinementControls";
import PMFDashboard from "@/components/PMFDashboard";
import DemographicsAnalysis from "@/components/DemographicsAnalysis";
import FeatureChecklist from "@/components/FeatureChecklist";
import ActionTips from "@/components/ActionTips";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Sparkles, RefreshCw, Database } from "lucide-react";

const Index = () => {
  const [idea, setIdea] = useState("");
  const [pmfScore, setPmfScore] = useState(0);
  const [refinements, setRefinements] = useState({
    budget: "bootstrapped",
    market: "niche",
    timeline: "mvp",
  });

  const handleRefinementChange = (key: string, value: string) => {
    setRefinements(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setIdea("");
    setRefinements({
      budget: "bootstrapped",
      market: "niche",
      timeline: "mvp",
    });
    setPmfScore(0);
  };

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
                <Database className="w-3 h-3" />
                Supabase Ready
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-2 hover:bg-destructive/10 hover:border-destructive"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
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
              <IdeaInput value={idea} onChange={setIdea} />
              <RefinementControls refinements={refinements} onChange={handleRefinementChange} />
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

            {/* Right Column - Features & Actions */}
            <div className="lg:col-span-1 space-y-6">
              <FeatureChecklist idea={idea} budget={refinements.budget} />
              <ActionTips score={pmfScore} />
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-border/50">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Ready to build your validated idea? Connect Supabase for full backend functionality
              </p>
              <Button 
                size="lg"
                className="bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <Database className="w-4 h-4 mr-2" />
                Connect Supabase & Build
              </Button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default Index;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PMFAnalyzer from "@/components/PMFAnalyzer";
import PMFDashboardTabs from "@/components/PMFDashboardTabs";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [pmfScore, setPmfScore] = useState(0);
  
  // Get saved data from localStorage or URL params
  const savedIdea = localStorage.getItem('userIdea') || '';
  const savedRefinements = JSON.parse(localStorage.getItem('userRefinements') || '{}');
  const savedMetadata = JSON.parse(localStorage.getItem('ideaMetadata') || '{}');
  const savedAnswers = JSON.parse(localStorage.getItem('userAnswers') || '{}');
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Analysis
          </Button>
          <UserMenu />
        </div>
        
        {/* Dashboard Content */}
        <PMFDashboardTabs
          idea={savedIdea}
          refinements={savedRefinements}
          metadata={savedMetadata}
          userAnswers={savedAnswers}
          onScoreUpdate={setPmfScore}
        />
      </div>
    </div>
  );
};

export default Dashboard;
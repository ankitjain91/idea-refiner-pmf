import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useIdeaManagement } from '@/hooks/useIdeaManagement';
import { GlobalFilters } from '@/components/hub/GlobalFilters';
import { DataTile } from '@/components/hub/DataTile';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, Users, Target, BarChart3, DollarSign,
  Briefcase, Trophy, Map, Calculator, Shield,
  MessageSquare, Lightbulb, Handshake, Zap, AlertCircle,
  ArrowLeft, FileText, Settings, Brain, RefreshCw
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import GuidedIdeaWithSuggestions from '@/components/hub/GuidedIdeaWithSuggestions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { IdeaConfirmationDialog } from '@/components/hub/IdeaConfirmationDialog';
 
 // Tile configurations
const TILES = [
  {
    id: 'search-trends',
    title: 'Search Trends',
    icon: TrendingUp,
    tileType: 'search-trends',
    description: 'Current market interest and rising queries'
  },
  {
    id: 'competitor-landscape',
    title: 'Competitor Landscape',
    icon: Users,
    tileType: 'competitor-landscape',
    description: 'Key players and their positioning'
  },
  {
    id: 'target-audience',
    title: 'Target Audience Fit',
    icon: Target,
    tileType: 'target-audience',
    description: 'Demographics and segment analysis'
  },
  {
    id: 'pm-fit-score',
    title: 'PM Fit Score',
    icon: BarChart3,
    tileType: 'pm-fit-score',
    description: 'Product-Market Fit likelihood assessment'
  },
  {
    id: 'market-potential',
    title: 'Market Potential',
    icon: DollarSign,
    tileType: 'market-potential',
    description: 'TAM, SAM, and SOM estimates'
  },
  {
    id: 'unit-economics',
    title: 'Unit Economics',
    icon: Calculator,
    tileType: 'unit-economics',
    description: 'CAC and LTV benchmarks'
  },
  {
    id: 'funding-pathways',
    title: 'Funding Pathways',
    icon: Briefcase,
    tileType: 'funding-pathways',
    description: 'Recent funding rounds and investors'
  },
  {
    id: 'success-stories',
    title: 'Comparable Success Stories',
    icon: Trophy,
    tileType: 'success-stories',
    description: 'Similar startups that succeeded'
  },
  {
    id: 'roadmap',
    title: 'Execution Roadmap',
    icon: Map,
    tileType: 'roadmap',
    description: '30/60/90-day action plan'
  },
  {
    id: 'resource-estimator',
    title: 'Resource Estimator',
    icon: Calculator,
    tileType: 'resource-estimator',
    description: 'Budget, time, and team requirements'
  },
  {
    id: 'risk-matrix',
    title: 'Risk Matrix',
    icon: Shield,
    tileType: 'risk-matrix',
    description: 'Key risks and mitigation strategies'
  },
  {
    id: 'social-sentiment',
    title: 'Social Sentiment',
    icon: MessageSquare,
    tileType: 'social-sentiment',
    description: 'Community feedback and discussions'
  },
  {
    id: 'quick-poll',
    title: 'Validation Questions',
    icon: Lightbulb,
    tileType: 'quick-poll',
    description: 'Poll questions for user validation'
  },
  {
    id: 'partnerships',
    title: 'Partnership Opportunities',
    icon: Handshake,
    tileType: 'partnerships',
    description: 'Potential partners and integrations'
  },
  {
    id: 'simulations',
    title: 'What-If Simulations',
    icon: Zap,
    tileType: 'simulations',
    description: 'Impact of strategic changes'
  }
];

export default function EnterpriseHub() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  const {
    filters,
    setFilters,
    showQuestionnaire,
    setShowQuestionnaire,
    handleIdeaSubmit,
    pendingIdea,
    confirmIdea,
    cancelIdeaConfirmation
  } = useIdeaManagement();
  
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // The idea management logic is now handled by the useIdeaManagement hook
  // Fetching from Supabase is handled in a separate hook inside useIdeaManagement
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { state: { from: { pathname: '/enterprise-hub' }, openAuthModal: true } });
    }
  }, [user, authLoading, navigate]);
  
  // Keyboard shortcut for diagnostics
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') {
        setShowDiagnostics(!showDiagnostics);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showDiagnostics]);
  
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };
  
  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Handle auto-refresh toggle
  useEffect(() => {
    if (autoRefresh && filters.idea_keywords.length > 0) {
      autoRefreshIntervalRef.current = setInterval(() => {
        setRefreshKey(prev => prev + 1);
      }, 30000); // Refresh every 30 seconds
    } else if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh, filters.idea_keywords.length]);
  
  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`idea-validation-hub-${new Date().toISOString()}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };
  
  if (!filters.idea_keywords.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-2xl w-full p-8">
          <div className="text-center space-y-6">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10">
              <Brain className="h-12 w-12 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Dashboard Needs Your Startup Idea</h2>
              <p className="text-muted-foreground">
                The dashboard analyzes your startup idea with real market data. 
                Please share your idea first to begin the analysis.
              </p>
            </div>

            <Alert className="text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How to get started:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Go to the Idea Chat and describe your startup idea</li>
                  <li>• The dashboard will automatically detect your idea</li>
                  <li>• Real-time market analysis will begin immediately</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 justify-center">
              <Button size="lg" onClick={() => setShowQuestionnaire(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Start AI‑Guided Questionnaire
              </Button>
              <Button onClick={() => navigate('/ideachat')} size="lg" variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Idea Chat
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => {
                  window.location.reload();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Dashboard
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Once you've shared your idea, the dashboard will analyze:</p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                <Badge variant="secondary">Market Size</Badge>
                <Badge variant="secondary">Competition</Badge>
                <Badge variant="secondary">PMF Score</Badge>
                <Badge variant="secondary">Growth Metrics</Badge>
                <Badge variant="secondary">Marketing Channels</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Dialog open={showQuestionnaire} onOpenChange={setShowQuestionnaire}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI‑Guided Idea Questionnaire</DialogTitle>
              <DialogDescription>
                Choose from AI suggestions or create your own startup idea.
              </DialogDescription>
            </DialogHeader>
            <GuidedIdeaWithSuggestions onSubmit={handleIdeaSubmit} />
          </DialogContent>
        </Dialog>
        
        <IdeaConfirmationDialog
          pendingIdea={pendingIdea}
          onConfirm={confirmIdea}
          onCancel={cancelIdeaConfirmation}
        />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background overflow-auto">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ideachat')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Chat
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Idea Validation & Pursuit Hub</h1>
                <p className="text-sm text-muted-foreground">
                  From brainstorming to execution — all the insights you need in one place
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              title="Diagnostics (Alt+D)"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Global Filters - Made sticky with proper z-index */}
      <GlobalFilters
        onFiltersChange={handleFiltersChange}
        onExport={handleExportPDF}
        onRefresh={handleRefreshAll}
        currentFilters={filters}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
      />
      
      {/* Dashboard Grid */}
      <div ref={dashboardRef} className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TILES.map(tile => (
            <DataTile
              key={`${tile.id}-${refreshKey}`}
              title={tile.title}
              icon={tile.icon}
              tileType={tile.tileType}
              filters={filters}
              description={tile.description}
            />
          ))}
        </div>
      </div>
      
      {/* Diagnostics Panel */}
      {showDiagnostics && (
        <div className="fixed bottom-4 right-4 w-96 bg-card border rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Diagnostics</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiagnostics(false)}
            >
              ×
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Active Filters:</span>
              <span className="font-mono">{filters.idea_keywords.length} keywords</span>
            </div>
            <div className="flex justify-between">
              <span>Geography:</span>
              <span className="font-mono">{filters.geography}</span>
            </div>
            <div className="flex justify-between">
              <span>Time Window:</span>
              <span className="font-mono">{filters.time_window}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Tiles:</span>
              <span className="font-mono">{TILES.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Refresh Count:</span>
              <span className="font-mono">{refreshKey}</span>
            </div>
          </div>
        </div>
      )}
      
      <IdeaConfirmationDialog
        pendingIdea={pendingIdea}
        onConfirm={confirmIdea}
        onCancel={cancelIdeaConfirmation}
      />
    </div>
  );
}
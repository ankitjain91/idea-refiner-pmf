import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { GlobalFilters } from '@/components/hub/GlobalFilters';
import { DataTile } from '@/components/hub/DataTile';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, Users, Target, BarChart3, DollarSign,
  Briefcase, Trophy, Map, Calculator, Shield,
  MessageSquare, Lightbulb, Handshake, Zap, AlertCircle,
  ArrowLeft, FileText, Settings
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  
  const [filters, setFilters] = useState({
    idea_keywords: [],
    industry: '',
    geography: 'global',
    time_window: 'last_12_months'
  });
  
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Load initial idea from localStorage
  useEffect(() => {
    const storedIdea = localStorage.getItem('userIdea') || localStorage.getItem('currentIdea');
    if (storedIdea) {
      // Extract keywords from idea
      const keywords = storedIdea.split(' ')
        .filter(word => word.length > 3)
        .slice(0, 5);
      setFilters(prev => ({
        ...prev,
        idea_keywords: keywords
      }));
    }
  }, []);
  
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
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-4">
                <p>No idea keywords detected. Please provide your startup idea to begin analysis.</p>
                <Button onClick={() => navigate('/ideachat')}>
                  Go to Idea Chat
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
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
      
      {/* Global Filters */}
      <GlobalFilters
        onFiltersChange={handleFiltersChange}
        onExport={handleExportPDF}
        onRefresh={handleRefreshAll}
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
    </div>
  );
}
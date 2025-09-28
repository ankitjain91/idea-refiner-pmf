import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
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
import { toast } from '@/hooks/use-toast';
import GuidedIdeaWithSuggestions from '@/components/hub/GuidedIdeaWithSuggestions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
 
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
  const { currentSession } = useSession();
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
const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  
  // Load initial idea from localStorage + keep in sync
  useEffect(() => {
    const extractKeywords = (idea: string) => {
      const stop = new Set([
        'the','and','for','with','that','this','from','your','into','about','over','using','you','are','our','their','them','they','have','has','can','will','just','very','much','more','less','when','what','how','why','where','who','app','tool','idea','project','startup','ai'
      ]);
      const words = idea
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w && w.length > 2 && !stop.has(w));
      const unique = Array.from(new Set(words));
      if (unique.length > 0) return unique.slice(0, 5);
      const fallback = idea.split(/\s+/).filter(w => w.length >= 2).slice(0, 3);
      return fallback.length ? fallback : [idea.trim().slice(0, 30)];
    };

    const recompute = () => {
      // First check if we have a dashboard-specific idea
      const dashboardIdea = localStorage.getItem('dashboardIdea');
      
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
      
      // Priority: dashboard idea > conversation extraction > localStorage keys
      let ideaToUse = dashboardIdea || extractFromConversation();

      // Fallback: current session state
      if (!ideaToUse && currentSession?.data) {
        const sd: any = currentSession.data;
        if (typeof sd.currentIdea === 'string' && sd.currentIdea.trim()) {
          ideaToUse = sd.currentIdea.trim();
        }
        if (!ideaToUse && Array.isArray(sd.chatHistory)) {
          for (let i = sd.chatHistory.length - 1; i >= 0; i--) {
            const m = sd.chatHistory[i];
            const c = (m?.content || '').trim();
            if (c && c.length > 10 && (m.type === 'user' || m.role === 'user')) {
              ideaToUse = c;
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
        } catch {}
      }

      // Try to infer from chat histories if still missing
      if (!ideaToUse) {
        try {
          const enhancedRaw = localStorage.getItem('enhancedIdeaChatMessages');
          if (enhancedRaw) {
            const msgs = JSON.parse(enhancedRaw);
            const lastUser = [...msgs].reverse().find((m: any) => (m.type === 'user' || m.role === 'user') && typeof m.content === 'string' && m.content.trim().length > 10);
            if (lastUser?.content) ideaToUse = lastUser.content.trim();
          }
        } catch {}
      }
      if (!ideaToUse) {
        try {
          const chatRaw = localStorage.getItem('chatHistory');
          if (chatRaw) {
            const msgs = JSON.parse(chatRaw);
            const lastUser = [...msgs].reverse().find((m: any) => (m.type === 'user' || m.role === 'user') && typeof m.content === 'string' && m.content.trim().length > 10);
            if (lastUser?.content) ideaToUse = lastUser.content.trim();
          }
        } catch {}
      }

      const keywords = metaKeywords || (ideaToUse ? extractKeywords(ideaToUse) : []);
      console.log('EnterpriseHub recompute:', { dashboardIdea, ideaToUse, keywords });

      if (keywords.length) {
        setFilters(prev => ({
          ...prev,
          idea_keywords: keywords,
        }));
        
        // Store in session state for persistence
        sessionStorage.setItem('dashboardKeywords', JSON.stringify(keywords));
        sessionStorage.setItem('dashboardIdeaSource', ideaToUse);
      }
    };

    // Check if we have session state first
    const sessionKeywords = sessionStorage.getItem('dashboardKeywords');
    if (sessionKeywords) {
      try {
        const keywords = JSON.parse(sessionKeywords);
        if (keywords.length) {
          setFilters(prev => ({
            ...prev,
            idea_keywords: keywords,
          }));
          return;
        }
      } catch {}
    }

    recompute();

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
  
  // Fallback: fetch latest idea from Supabase if no keywords yet
  useEffect(() => {
    const run = async () => {
      if (!user || filters.idea_keywords.length) return;

      const extract = (idea: string) => {
        const stop = new Set([
          'the','and','for','with','that','this','from','your','into','about','over','using','you','are','our','their','them','they','have','has','can','will','just','very','much','more','less','when','what','how','why','where','who','app','tool','idea','project','startup','ai'
        ]);
        const words = (idea || '')
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, ' ')
          .split(/\s+/)
          .filter(w => w && w.length > 2 && !stop.has(w));
        const unique = Array.from(new Set(words));
        return unique.length ? unique.slice(0, 5) : (idea ? [idea.trim().slice(0, 30)] : []);
      };

      try {
        const { data: sess, error: sessErr } = await supabase
          .from('analysis_sessions')
          .select('idea')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sessErr) console.warn('EnterpriseHub: analysis_sessions query error', sessErr);
        if (sess?.idea) {
          const kws = extract(sess.idea);
          if (kws.length) {
            setFilters(prev => ({ ...prev, idea_keywords: kws }));
            return;
          }
        }

        const { data: ideaRow, error: ideaErr } = await supabase
          .from('ideas')
          .select('original_idea, refined_idea, keywords')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (ideaErr) console.warn('EnterpriseHub: ideas query error', ideaErr);
        if (ideaRow) {
          const kws = Array.isArray(ideaRow.keywords) && ideaRow.keywords.length
            ? ideaRow.keywords.slice(0, 5)
            : extract(ideaRow.refined_idea || ideaRow.original_idea || '');
          if (kws.length) setFilters(prev => ({ ...prev, idea_keywords: kws }));
        }
      } catch (e) {
        console.warn('EnterpriseHub: fallback fetch failed', e);
      }
    };

    run();
  }, [filters.idea_keywords.length, user]);
  
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

const handleIdeaSubmit = (idea: string, metadata: any) => {
  console.log('EnterpriseHub handleIdeaSubmit', { idea, metadata });
  const extract = (text: string) => {
    const stop = new Set([
      'the','and','for','with','that','this','from','your','into','about','over','using','you','are','our','their','them','they','have','has','can','will','just','very','much','more','less','when','what','how','why','where','who','app','tool','idea','project','startup','ai'
    ]);
    const words = (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w && w.length > 2 && !stop.has(w));
    const unique = Array.from(new Set(words));
    return unique.length ? unique.slice(0, 5) : (text ? [text.trim().slice(0, 30)] : []);
  };

  let kws = extract(idea);
  if (!kws.length && Array.isArray(metadata?.tags) && metadata.tags.length) {
    kws = metadata.tags.slice(0, 5);
  }
  console.log('EnterpriseHub extracted keywords', kws);

  if (kws.length) {
    setFilters(prev => ({ ...prev, idea_keywords: kws }));
    sessionStorage.setItem('dashboardKeywords', JSON.stringify(kws));
    sessionStorage.setItem('dashboardIdeaSource', idea);
    localStorage.setItem('dashboardIdea', idea);
    toast({ title: 'Idea captured', description: 'Seeding dashboard with AI insights...' });
    setShowQuestionnaire(false);
  } else {
    toast({ title: 'Could not parse idea', description: 'Try editing the idea or add tags.', variant: 'destructive' });
  }
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
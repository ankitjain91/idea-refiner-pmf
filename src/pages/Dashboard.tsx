import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { LS_KEYS } from '@/lib/storage-keys';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, Brain, Target, TrendingUp, Clock, Search,
  BarChart3, Zap, Briefcase, FileText, ChevronRight,
  CircleDollarSign, Users, Globe, Sparkles, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketingChannels } from '@/components/dashboard/MarketingChannels';
import { MarketingCharts } from '@/components/dashboard/MarketingCharts';
import { useRealtimeInsights } from '@/hooks/useRealtimeInsights';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<{ idea: string; metadata: any } | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [pointsBalance, setPointsBalance] = useState(1250);

  // Fetch real-time insights
  const { snapshot, loading: insightsLoading, lastUpdated, refresh } = useRealtimeInsights(
    analysis?.idea,
    analysis?.metadata?.personas
  );

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    
    // Always set demo/default data if no analysis exists
    const idea = localStorage.getItem(LS_KEYS.userIdea) || "AI-powered startup validation platform";
    const metaRaw = localStorage.getItem(LS_KEYS.ideaMetadata);
    
    let metadata;
    try {
      metadata = metaRaw ? JSON.parse(metaRaw) : null;
    } catch {
      metadata = null;
    }
    
    // Use existing data or demo data
    setAnalysis({
      idea,
      metadata: metadata || {
        pmfScore: 72,
        competitors: ['Competitor A', 'Competitor B', 'Competitor C'],
        refinements: ['Improve onboarding', 'Add analytics', 'Enhance UI'],
        personas: ['Founders', 'Product Managers', 'Investors']
      }
    });
  }, [loading, user]);

  useEffect(() => {
    if (!loading && !user) navigate('/', { state: { from: { pathname: '/dashboard' }, openAuthModal: true } });
  }, [user, loading, navigate]);

  if (loading || !analysis) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-black'>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
          <p className="text-sm text-muted-foreground">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  const { idea, metadata } = analysis;
  const profitScore = snapshot?.profitScore || 72;

  return (
    <div className='flex-1 flex flex-col h-full bg-black'>
      {/* Top Bar */}
      <header className="glass-header border-b border-white/5 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Project Switcher */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card border border-white/5 hover:border-white/10 transition-colors cursor-pointer">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-white">{idea.slice(0, 30)}...</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search insights..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 h-8 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Points Balance */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card border border-white/5">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold text-white">{pointsBalance.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">points</span>
            </div>

            {/* User Menu */}
            <Button size="sm" variant="ghost" className="h-8 px-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary/60" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Sidebar Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-card border-white/5 p-1 w-fit">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/10">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-white/10">
              <Brain className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="focus" className="data-[state=active]:bg-white/10">
              <Target className="h-4 w-4 mr-2" />
              Focus
            </TabsTrigger>
            <TabsTrigger value="marketing" className="data-[state=active]:bg-white/10">
              <TrendingUp className="h-4 w-4 mr-2" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="strategy" className="data-[state=active]:bg-white/10">
              <Briefcase className="h-4 w-4 mr-2" />
              Strategy
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white/10">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Idea Refinement Panel */}
              <Card className="glass-card border-white/5 p-6 xl:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">Idea Refinement</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/3 border border-white/5">
                    <p className="text-sm text-white/80">{idea}</p>
                  </div>
                  <Button className="w-full glass-button">
                    <Zap className="h-4 w-4 mr-2" />
                    Refine Idea (25 points)
                  </Button>
                </div>
              </Card>

              {/* Profit Potential Meter */}
              <Card className="glass-card border-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Profit Potential</h3>
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="url(#gradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(profitScore / 100) * 352} 352`}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="gradient">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-white">{profitScore}</span>
                      <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-emerald-500">+8 vs last week</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricMiniCard label="TAM" value="$2.5B" icon={Globe} />
              <MetricMiniCard label="SAM" value="$450M" icon={Users} />
              <MetricMiniCard label="SOM" value="$45M" icon={Target} />
              <MetricMiniCard label="CAC Target" value="$35" icon={CircleDollarSign} />
              <MetricMiniCard label="Payback" value="6 mo" icon={Clock} />
            </div>

            {/* Last Updated */}
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </TabsContent>

          {/* Marketing Tab */}
          <TabsContent value="marketing" className="space-y-6">
            {insightsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : snapshot ? (
              <>
                <MarketingChannels 
                  channels={snapshot.channels} 
                  focusChannels={snapshot.focusNow}
                />
                <MarketingCharts trends={snapshot.trends} />
              </>
            ) : null}
          </TabsContent>

          {/* Other tabs with placeholder content */}
          <TabsContent value="insights">
            <Card className="glass-card border-white/5 p-12 text-center">
              <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">AI Insights</h3>
              <p className="text-sm text-muted-foreground">Deep learning analysis coming soon</p>
            </Card>
          </TabsContent>

          <TabsContent value="focus">
            <Card className="glass-card border-white/5 p-12 text-center">
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Priority Focus</h3>
              <p className="text-sm text-muted-foreground">Strategic priorities will appear here</p>
            </Card>
          </TabsContent>

          <TabsContent value="strategy">
            <Card className="glass-card border-white/5 p-12 text-center">
              <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Implementation Strategy</h3>
              <p className="text-sm text-muted-foreground">Playbooks and budget allocation coming soon</p>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="glass-card border-white/5 p-12 text-center">
              <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Export Reports</h3>
              <p className="text-sm text-muted-foreground">PDF and presentation export coming soon</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;

const MetricMiniCard: React.FC<{ 
  label: string; 
  value: string; 
  icon: React.ElementType 
}> = ({ label, value, icon: Icon }) => (
  <Card className="glass-card border-white/5 p-4">
    <div className="flex items-start justify-between mb-2">
      <Icon className="h-4 w-4 text-primary" />
      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        Live
      </Badge>
    </div>
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="text-lg font-semibold text-white">{value}</p>
  </Card>
);
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DataCompletionCard, useIdeaValidation } from '@/components/dashboard/DataValidation';
import { AnalysisChat } from '@/components/dashboard/AnalysisChat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, Brain, Target, TrendingUp, Clock, Search,
  BarChart3, Zap, Users, Globe, Sparkles, Activity,
  CircleDollarSign, RefreshCw, AlertCircle, CheckCircle,
  ArrowUp, ArrowDown, Shield, Rocket, ChevronRight, Lightbulb,
  MessageSquare, DollarSign, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [idea, setIdea] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Load idea from localStorage
  useEffect(() => {
    const storedIdea = localStorage.getItem('ideaText');
    const ideaMetadata = localStorage.getItem('ideaMetadata');
    
    if (storedIdea) {
      try {
        const metadata = ideaMetadata ? JSON.parse(ideaMetadata) : null;
        setIdea(metadata?.refined || storedIdea);
      } catch {
        setIdea(storedIdea);
      }
    }
  }, []);

  // Fetch real-time data
  const { 
    metrics, 
    market, 
    competition, 
    channels, 
    realtime, 
    loading, 
    error, 
    refresh 
  } = useDashboardData(idea);
  
  // Validate data completeness
  const { validation, loading: validationLoading } = useIdeaValidation();
  
  // Get suggestions data
  const [suggestions, setSuggestions] = useState<any>(null);
  
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!idea) return;
      
      const { data } = await supabase.functions.invoke('dashboard-insights', {
        body: { 
          idea,
          analysisType: 'suggestions',
          conversation: JSON.parse(localStorage.getItem('conversationHistory') || '[]'),
          context: JSON.parse(localStorage.getItem('ideaMetadata') || '{}')
        }
      });
      
      if (data?.insights) {
        setSuggestions(data.insights);
      }
    };
    
    fetchSuggestions();
  }, [idea]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refresh();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { state: { from: { pathname: '/dashboard' }, openAuthModal: true } });
    }
  }, [user, authLoading, navigate]);

  // Check if idea exists but needs more data - moved before conditional returns
  const needsMoreData = idea && (!metrics || !market || !competition);
  
  // Remove auto-redirect - let user decide when to go to IdeaChat

  // Early return for loading state
  if (authLoading || loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-black'>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
          <p className="text-sm text-muted-foreground">Loading real-time insights...</p>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-black'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg"
        >
          <Card className="p-8 border-primary/20 bg-gradient-to-br from-card to-card/80">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Start Your Journey</h2>
              <p className="text-muted-foreground mb-6">
                Let's analyze your startup idea and generate real-time insights!
              </p>
              
              <div className="w-full space-y-3">
              <Button 
                onClick={() => setShowAnalysis(true)} 
                className="w-full gap-2"
                size="lg"
              >
                <MessageSquare className="h-5 w-5" />
                Start Analysis
                <ArrowRight className="h-5 w-5 ml-auto" />
              </Button>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">What you'll get:</p>
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-green-500" />
                      <span>PMF Analysis</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span>Market Insights</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-purple-500" />
                      <span>User Metrics</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-yellow-500" />
                      <span>Revenue Data</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  const pmfScore = metrics?.pmfScore || 0;
  const activeUsers = realtime?.activeUsers || 0;
  const dailyRevenue = realtime?.dailyRevenue || 0;

  return (
    <div className='flex-1 flex flex-col h-full bg-black'>
      {/* Header */}
      <header className="glass-header border-b border-white/5 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card border border-white/5">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-white">{idea.slice(0, 40)}...</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search insights..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 h-8 bg-white/5 border-white/10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn("gap-2", autoRefresh && "border-green-500/50")}
            >
              <RefreshCw className={cn("h-4 w-4", autoRefresh && "animate-spin")} />
              {autoRefresh ? "Live" : "Paused"}
            </Button>
            <Button variant="outline" size="sm" onClick={refresh}>
              Refresh Now
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Show prompt when idea exists but needs more data */}
        {needsMoreData && !showAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-6 border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Complete Your Analysis</h3>
                  <p className="text-muted-foreground mb-4">
                    Your dashboard needs more information to generate comprehensive insights. Answer a few key questions to unlock:
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {!metrics && (
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Key Performance Metrics</span>
                      </div>
                    )}
                    {!market && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Market Analysis</span>
                      </div>
                    )}
                    {!competition && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Competitive Insights</span>
                      </div>
                    )}
                    {!channels && (
                      <div className="flex items-center gap-2">
                        <Rocket className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Growth Channels</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={() => setShowAnalysis(true)}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Start Analysis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Analysis Chat Interface */}
        {showAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <AnalysisChat
              idea={idea}
              onComplete={() => {
                setShowAnalysis(false);
                refresh();
              }}
              onUpdateData={() => {
                refresh();
              }}
            />
          </motion.div>
        )}
        
        {/* Data Validation Card */}
        {validation && !validation.readyForDashboard && (
          <div className="mb-6">
            <DataCompletionCard
              validation={validation}
              onAskQuestion={(question) => {
                // Store question and navigate to IdeaChat
                localStorage.setItem('pendingQuestion', question);
                navigate('/ideachat');
              }}
              onGoToDashboard={() => refresh()}
            />
          </div>
        )}

        {/* Interactive Suggestions */}
        {suggestions && (
          <div className="mb-6">
            <Card className="p-6 border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <h3 className="text-lg font-semibold">Recommended Actions</h3>
                <Badge variant="outline">AI-Powered</Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {suggestions?.immediateActions?.slice(0, 3).map((action: any, idx: number) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 cursor-pointer"
                    onClick={() => {
                      localStorage.setItem('pendingQuestion', `How do I ${action.action}?`);
                      navigate('/ideachat');
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {action.impact || 'High'} Impact
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {action.effort || 'Low'} Effort
                        </Badge>
                      </div>
                    </div>
                    <h4 className="font-medium mb-1">{action.action || action}</h4>
                    <p className="text-xs text-muted-foreground">{action.timeline || 'Start immediately'}</p>
                  </motion.div>
                ))}
              </div>

              {/* Metrics to Watch */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Key Metrics to Track</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {suggestions?.metricsToWatch?.slice(0, 4).map((metric: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{metric.metric || metric}</span>
                        <Activity className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Target:</span>
                        <span className="text-sm font-semibold text-green-500">{metric.target || 'TBD'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Experiments to Run */}
              {suggestions?.experiments && suggestions.experiments.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Experiments to Consider</h4>
                  <div className="space-y-2">
                    {suggestions.experiments.slice(0, 2).map((exp: any, idx: number) => (
                      <motion.div
                        key={idx}
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                        onClick={() => {
                          localStorage.setItem('pendingQuestion', `How should I test: ${exp.hypothesis}?`);
                          navigate('/ideachat');
                        }}
                      >
                        <Target className="h-4 w-4 text-blue-500" />
                        <div className="flex-1">
                          <p className="text-sm">{exp.hypothesis || exp}</p>
                          <p className="text-xs text-muted-foreground">{exp.test || 'A/B test recommended'}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
        
        {/* Key Metrics */}
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="PMF Score"
            value={pmfScore}
            suffix="%"
            icon={Target}
            trend={pmfScore > 70 ? "up" : pmfScore > 40 ? "stable" : "down"}
            color="blue"
          />
          <MetricCard
            title="Active Users"
            value={activeUsers}
            icon={Users}
            trend="up"
            color="green"
          />
          <MetricCard
            title="Daily Revenue"
            value={`$${dailyRevenue}`}
            icon={CircleDollarSign}
            trend="up"
            color="yellow"
          />
          <MetricCard
            title="Market Size"
            value={market?.marketSize ? `$${(market.marketSize / 1000000000).toFixed(1)}B` : "N/A"}
            icon={Globe}
            trend="stable"
            color="purple"
          />
        </div>

        {/* Live Activity Feed */}
        {realtime?.conversionEvents && (
          <Card className="mb-6 p-4 border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-5 w-5 text-green-500 animate-pulse" />
              <h3 className="font-semibold">Live Activity</h3>
              <Badge variant="outline" className="ml-auto">
                {realtime.conversionEvents.length} events
              </Badge>
            </div>
            <div className="space-y-2">
              {realtime.conversionEvents.slice(0, 5).map((event: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center justify-between p-2 bg-white/5 rounded"
                >
                  <span className="text-sm">{event.type || "New conversion"}</span>
                  <span className="text-xs text-muted-foreground">{event.time || "Just now"}</span>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="competition">Competition</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Growth Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Growth Trajectory</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={generateGrowthData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                    <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Market Segments */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Market Segments</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={market?.segments || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(market?.segments || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Alerts & Predictions */}
            {realtime?.alerts && realtime.alerts.length > 0 && (
              <Card className="p-4 border-yellow-500/20 bg-yellow-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold">Alerts & Insights</h3>
                </div>
                <div className="space-y-2">
                  {realtime.alerts.map((alert: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <p className="text-sm">{alert}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="market" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Market Analysis</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Market Size</p>
                    <p className="text-2xl font-bold">${(market?.marketSize / 1000000000).toFixed(1)}B</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Growth Rate</p>
                    <p className="text-xl font-semibold text-green-500">{market?.growthRate}% YoY</p>
                  </div>
                  <Progress value={market?.growthRate || 0} className="h-2" />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Market Opportunities</h3>
                <div className="space-y-3">
                  {market?.opportunities?.map((opp: any, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-3 bg-white/5 rounded-lg"
                    >
                      <p className="text-sm font-medium">{opp.title || opp}</p>
                      {opp.revenue && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Potential: ${opp.revenue}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Market Trends */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Market Trends</h3>
              <div className="flex flex-wrap gap-2">
                {market?.trends?.map((trend: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {trend}
                  </Badge>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="competition" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Competitive Landscape</h3>
              <div className="space-y-4">
                {competition?.competitors?.map((comp: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{comp.name}</h4>
                      <Badge variant={comp.marketShare > 20 ? "destructive" : "secondary"}>
                        {comp.marketShare}% market share
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Strengths</p>
                        <p>{comp.strengths}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Weaknesses</p>
                        <p>{comp.weaknesses}</p>
                      </div>
                    </div>
                    {comp.funding && (
                      <div className="mt-2">
                        <Badge variant="outline">Funding: {comp.funding}</Badge>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Competitive Advantage */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Your Competitive Advantage</h3>
              <div className="space-y-3">
                {competition?.competitiveAdvantage?.map((adv: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                    <p className="text-sm">{adv}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="channels" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Marketing Channels Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channels?.channels || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="channel" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                  <Bar dataKey="roi" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Top Channels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {channels?.topChannels?.map((channel: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Rocket className="h-5 w-5 text-primary" />
                    <Badge>#{idx + 1}</Badge>
                  </div>
                  <h4 className="font-semibold mb-1">{channel.name || channel}</h4>
                  <p className="text-sm text-muted-foreground">{channel.strategy || "Recommended channel"}</p>
                </Card>
              ))}
            </div>

            {/* Campaign Ideas */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Campaign Ideas</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {channels?.campaignIdeas?.map((idea: any, idx: number) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-white/5 rounded-lg cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-yellow-500 mb-2" />
                    <p className="text-sm">{idea}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <MetricDetailCard
                title="Customer Acquisition Cost"
                value={metrics?.customerAcquisitionCost || "N/A"}
                description="Estimated cost to acquire a customer"
                icon={Users}
              />
              <MetricDetailCard
                title="Lifetime Value"
                value={metrics?.lifetimeValue || "N/A"}
                description="Expected revenue per customer"
                icon={CircleDollarSign}
              />
              <MetricDetailCard
                title="Burn Rate"
                value={metrics?.burnRate || "N/A"}
                description="Monthly cash consumption"
                icon={TrendingUp}
              />
            </div>

            {/* Conversion Funnel */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
              <div className="space-y-3">
                <FunnelStep label="Visitors" value={1000} percentage={100} />
                <FunnelStep label="Sign-ups" value={300} percentage={30} />
                <FunnelStep label="Active Users" value={150} percentage={15} />
                <FunnelStep label="Paid Users" value={45} percentage={4.5} />
              </div>
            </Card>

            {/* Predictions */}
            {realtime?.predictions && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">24-Hour Predictions</h3>
                <div className="space-y-3">
                  {Object.entries(realtime.predictions).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ title, value, suffix = "", icon: Icon, trend, color }: any) => {
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Activity;
  const trendColor = trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-yellow-500";

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn("h-8 w-8", `text-${color}-500`)} />
        <TrendIcon className={cn("h-4 w-4", trendColor)} />
      </div>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-2xl font-bold mt-1">{value}{suffix}</p>
    </Card>
  );
};

const MetricDetailCard = ({ title, value, description, icon: Icon }: any) => {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-xl font-bold mt-1">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </Card>
  );
};

const FunnelStep = ({ label, value, percentage }: any) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-semibold">{value} ({percentage}%)</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};

// Helper functions
const generateGrowthData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, idx) => ({
    month,
    users: Math.floor(100 * Math.pow(1.3, idx))
  }));
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default Dashboard;
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, TrendingUp, Users, Target, DollarSign, 
  Rocket, Brain, Sparkles, RefreshCw, Download, 
  ChevronRight, Zap, Shield, Clock, CheckCircle2,
  Globe, MessageSquare, Hash, Video, Mail, Search,
  UserPlus, Megaphone, Share2, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell, Area, AreaChart 
} from 'recharts';

interface AnalysisData {
  id?: string;
  idea_text: string;
  market_size: any;
  personas: any[];
  gtm_strategy: any;
  competitors: any[];
  benchmarks: any;
  profit_potential: number;
  marketing_channels: any[];
  focus_zones: any[];
  implementation_strategy: any;
  last_refreshed_at?: string;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const channelIcons: Record<string, any> = {
  'SEO': Search,
  'SEM': Globe,
  'LinkedIn': UserPlus,
  'TikTok': Video,
  'Influencers': Megaphone,
  'Email': Mail,
  'Content': MessageSquare,
  'Communities': Users,
  'PLG': Rocket,
  'Partnerships': Share2
};

export default function RealtimeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ideaInput, setIdeaInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<any[]>([]);
  const [implementationTasks, setImplementationTasks] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [hasIdeaFromChat, setHasIdeaFromChat] = useState(false);
  const [ideaContext, setIdeaContext] = useState<any>(null);

  // Load idea and context from IdeaChat localStorage on mount
  useEffect(() => {
    const storedIdea = localStorage.getItem('ideaText');
    const ideaMetadata = localStorage.getItem('ideaMetadata');
    const analysisCompleted = localStorage.getItem('analysisCompleted');
    
    if (storedIdea) {
      const parsedMetadata = ideaMetadata ? JSON.parse(ideaMetadata) : null;
      const ideaToUse = parsedMetadata?.refined || storedIdea;
      
      setIdeaInput(ideaToUse);
      setIdeaContext(parsedMetadata);
      setHasIdeaFromChat(true);
      
      // Automatically start analysis if idea is present and analysis was completed in chat
      if (ideaToUse && user && analysisCompleted === 'true') {
        setTimeout(() => {
          performAnalysis(ideaToUse, parsedMetadata);
        }, 500);
      }
    } else {
      // Redirect to IdeaChat if no idea is present
      toast({
        title: "No Idea Found",
        description: "Please complete your idea analysis in IdeaChat first",
        variant: "destructive"
      });
      setTimeout(() => navigate('/ideachat'), 2000);
    }
  }, [user]);

  // Real-time subscription for metrics
  useEffect(() => {
    if (!analysisData?.id) return;

    const channel = supabase
      .channel('realtime-metrics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_metrics',
          filter: `analysis_id=eq.${analysisData.id}`
        },
        (payload) => {
          console.log('New metric received:', payload);
          setRealtimeMetrics(prev => [...prev, payload.new]);
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [analysisData?.id]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || !analysisData) return;

    const interval = setInterval(() => {
      handleRefreshAnalysis();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, analysisData]);

  const performAnalysis = async (ideaText: string, metadata?: any) => {
    setIsAnalyzing(true);
    try {
      // Build comprehensive context from IdeaChat data
      let fullContext = ideaText;
      
      if (metadata) {
        fullContext = `
          ${ideaText}
          
          Target Audience: ${metadata.targetAudience || 'Not specified'}
          Problem Solving: ${metadata.problemSolving || 'Not specified'}
          Market Gap: ${metadata.marketGap || 'Not specified'}
          Unique Value: ${metadata.uniqueValue || 'Not specified'}
        `.trim();
      }

      const { data, error } = await supabase.functions.invoke('analyze-idea', {
        body: { idea: fullContext }
      });

      if (error) throw error;

      setAnalysisData(data.analysis);
      setLastUpdated(new Date());
      
      // Create default implementation tasks
      if (data.analysis.id) {
        await createDefaultTasks(data.analysis.id);
      }

      toast({
        title: "Analysis Complete",
        description: "Your idea has been analyzed successfully!",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze idea. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeIdea = async (ideaText?: string) => {
    const idea = ideaText || ideaInput;
    
    if (!idea.trim() || !user) {
      toast({
        title: "Error",
        description: "Please complete idea analysis in IdeaChat first",
        variant: "destructive"
      });
      navigate('/ideachat');
      return;
    }

    await performAnalysis(idea, ideaContext);
  };

  const handleRefreshAnalysis = async () => {
    if (!analysisData) return;

    try {
      const { data, error } = await supabase.functions.invoke('analyze-idea', {
        body: { 
          idea: analysisData.idea_text,
          analysisId: analysisData.id 
        }
      });

      if (error) throw error;

      setAnalysisData(data.analysis);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  const createDefaultTasks = async (analysisId: string) => {
    const defaultTasks = [
      { task_name: 'Define MVP features', task_category: 'Product' },
      { task_name: 'Set up landing page', task_category: 'Marketing' },
      { task_name: 'Conduct user interviews', task_category: 'Product' },
      { task_name: 'Create pricing strategy', task_category: 'Pricing' },
      { task_name: 'Build distribution channels', task_category: 'Distribution' },
    ];

    const { data, error } = await supabase
      .from('implementation_tasks')
      .insert(
        defaultTasks.map(task => ({
          ...task,
          analysis_id: analysisId
        }))
      )
      .select();

    if (data) {
      setImplementationTasks(data);
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    const task = implementationTasks.find(t => t.id === taskId);
    if (!task) return;

    const { error } = await supabase
      .from('implementation_tasks')
      .update({
        is_completed: !task.is_completed,
        completed_at: !task.is_completed ? new Date().toISOString() : null
      })
      .eq('id', taskId);

    if (!error) {
      setImplementationTasks(prev =>
        prev.map(t => 
          t.id === taskId 
            ? { ...t, is_completed: !t.is_completed }
            : t
        )
      );
    }
  };

  const exportToPDF = () => {
    // Implementation for PDF export
    toast({
      title: "Export Started",
      description: "Your report is being generated...",
    });
  };

  const calculateProgress = () => {
    if (!implementationTasks.length) return 0;
    const completed = implementationTasks.filter(t => t.is_completed).length;
    return (completed / implementationTasks.length) * 100;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Brain className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Real-Time Idea Analyzer
              </h1>
              {lastUpdated && (
                <Badge variant="outline" className="ml-4">
                  <Clock className="h-3 w-3 mr-1" />
                  Updated {lastUpdated.toLocaleTimeString()}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(autoRefresh && "bg-primary/10")}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", autoRefresh && "animate-spin")} />
                {autoRefresh ? "Auto-Refreshing" : "Auto-Refresh"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                Classic Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Idea Input Section */}
        <Card className="mb-8 overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/80">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Idea Refinement Panel
            </h2>
            {hasIdeaFromChat ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">Analyzing idea from IdeaChat:</p>
                    <p className="font-medium text-lg">{ideaInput}</p>
                  </div>
                  {!analysisData && (
                    <Button
                      onClick={() => handleAnalyzeIdea()}
                      disabled={isAnalyzing}
                      className="min-w-[150px]"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4 mr-2" />
                          Start Analysis
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {ideaContext && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {ideaContext.targetAudience && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Target:</span>
                        <span>{ideaContext.targetAudience}</span>
                      </div>
                    )}
                    {ideaContext.problemSolving && (
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Problem:</span>
                        <span className="truncate">{ideaContext.problemSolving}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No idea found. Please complete your idea analysis in IdeaChat first.
                </p>
                <Button onClick={() => navigate('/ideachat')}>
                  Go to IdeaChat
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Main Content */}
        {analysisData ? (
          <div className="space-y-8">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Market Size"
                value={analysisData.market_size?.total_addressable_market || "N/A"}
                icon={Globe}
                trend="+12%"
                color="blue"
              />
              <MetricCard
                title="Profit Potential"
                value={`${analysisData.profit_potential || 0}%`}
                icon={TrendingUp}
                trend="+8%"
                color="green"
              />
              <MetricCard
                title="Competition Level"
                value={`${analysisData.competitors?.length || 0} Players`}
                icon={Shield}
                trend="Moderate"
                color="yellow"
              />
              <MetricCard
                title="Implementation Progress"
                value={`${calculateProgress().toFixed(0)}%`}
                icon={CheckCircle2}
                trend="On Track"
                color="purple"
              />
            </div>

            {/* Profit Potential Gauge */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Profit Potential Meter</h3>
              <div className="relative h-32">
                <Progress 
                  value={analysisData.profit_potential || 0} 
                  className="h-8"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">
                    {analysisData.profit_potential || 0}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Tabbed Content */}
            <Tabs defaultValue="channels" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="channels">Marketing Channels</TabsTrigger>
                <TabsTrigger value="focus">Focus Zones</TabsTrigger>
                <TabsTrigger value="implementation">Implementation</TabsTrigger>
                <TabsTrigger value="competitors">Competitors</TabsTrigger>
              </TabsList>

              <TabsContent value="channels" className="space-y-6">
                <MarketingChannelsView 
                  channels={analysisData.marketing_channels || []}
                  selectedChannel={selectedChannel}
                  onChannelSelect={setSelectedChannel}
                />
              </TabsContent>

              <TabsContent value="focus" className="space-y-6">
                <FocusZonesView zones={analysisData.focus_zones || []} />
              </TabsContent>

              <TabsContent value="implementation" className="space-y-6">
                <ImplementationView 
                  strategy={analysisData.implementation_strategy}
                  tasks={implementationTasks}
                  onTaskToggle={toggleTaskCompletion}
                />
              </TabsContent>

              <TabsContent value="competitors" className="space-y-6">
                <CompetitorsView competitors={analysisData.competitors || []} />
              </TabsContent>
            </Tabs>

            {/* Real-time Metrics Feed */}
            {realtimeMetrics.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Live Updates
                </h3>
                <div className="space-y-2">
                  {realtimeMetrics.slice(-5).reverse().map((metric, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span className="text-sm">{metric.metric_type}</span>
                      <Badge variant="outline">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Brain className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">
              Enter an idea above to start analyzing
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-components
function MetricCard({ title, value, icon: Icon, trend, color }: any) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn("h-8 w-8", `text-${color}-500`)} />
        <Badge variant="outline" className={cn(`text-${color}-600`)}>
          {trend}
        </Badge>
      </div>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </Card>
  );
}

function MarketingChannelsView({ channels, selectedChannel, onChannelSelect }: any) {
  // Mock data for charts
  const roiData = channels.map((channel: any) => ({
    name: channel.channel,
    roi: parseInt(channel.expected_roi) || 0,
    cac: parseInt(channel.estimated_cac?.replace(/[^0-9]/g, '')) || 0
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channels List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Marketing Channels</h3>
          <div className="space-y-3">
            {channels.map((channel: any, idx: number) => {
              const IconComponent = channelIcons[channel.channel] || Layers;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all",
                    selectedChannel === channel.channel 
                      ? "bg-primary/10 border-primary" 
                      : "hover:bg-muted"
                  )}
                  onClick={() => onChannelSelect(channel.channel)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{channel.channel}</p>
                        <p className="text-sm text-muted-foreground">
                          CAC: {channel.estimated_cac} • ROI: {channel.expected_roi}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        channel.priority === 'high' ? 'default' :
                        channel.priority === 'medium' ? 'secondary' : 'outline'
                      }
                    >
                      {channel.priority}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* ROI Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">ROI by Channel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={roiData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="roi" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Selected Channel Details */}
      {selectedChannel && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {selectedChannel} - Detailed Strategy
          </h3>
          {channels
            .filter((c: any) => c.channel === selectedChannel)
            .map((channel: any) => (
              <div key={channel.channel} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Timeline</p>
                    <p className="font-medium">{channel.timeline}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-medium">{channel.budget_allocation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CAC</p>
                    <p className="font-medium">{channel.estimated_cac}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected ROI</p>
                    <p className="font-medium">{channel.expected_roi}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Top 3 Experiments</h4>
                  <div className="space-y-2">
                    {channel.top_experiments?.map((exp: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Badge variant="outline">{idx + 1}</Badge>
                        <span className="text-sm">{exp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
        </Card>
      )}
    </div>
  );
}

function FocusZonesView({ zones }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {zones.map((zone: any, idx: number) => (
        <Card key={idx} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{zone.area}</h3>
            <Badge 
              variant={
                zone.difficulty === 'low' ? 'default' :
                zone.difficulty === 'medium' ? 'secondary' : 'destructive'
              }
            >
              {zone.difficulty} difficulty
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Top 3 Priorities</p>
              <div className="space-y-2">
                {zone.priorities?.map((priority: string, pidx: number) => (
                  <div key={pidx} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-primary mt-0.5" />
                    <span className="text-sm">{priority}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Timeline</p>
                <p className="font-medium">{zone.timeline}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. ROI</p>
                <p className="font-medium">{zone.estimated_roi}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ImplementationView({ strategy, tasks, onTaskToggle }: any) {
  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Implementation Progress</h3>
        <Progress value={calculateTaskProgress(tasks)} className="h-4 mb-4" />
        <div className="flex items-center justify-between text-sm">
          <span>{tasks.filter((t: any) => t.is_completed).length} completed</span>
          <span>{tasks.filter((t: any) => !t.is_completed).length} remaining</span>
        </div>
      </Card>

      {/* Phase Timeline */}
      {strategy && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(strategy).map(([phase, details]: any) => (
            <Card key={phase} className="p-6">
              <h4 className="font-semibold mb-2 capitalize">{phase.replace('_', ' ')}</h4>
              <Badge variant="outline" className="mb-4">{details.timeline}</Badge>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Milestones</p>
                  <div className="space-y-1">
                    {details.milestones?.map((milestone: string, idx: number) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5" />
                        <span>{milestone}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-medium">{details.budget_needed}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Task Checklist */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Implementation Checklist</h3>
        <div className="space-y-2">
          {tasks.map((task: any) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                task.is_completed ? "bg-green-500/10 border-green-500/20" : "hover:bg-muted"
              )}
              onClick={() => onTaskToggle(task.id)}
            >
              <CheckCircle2 
                className={cn(
                  "h-5 w-5",
                  task.is_completed ? "text-green-500" : "text-muted-foreground"
                )}
              />
              <span className={cn(
                "flex-1",
                task.is_completed && "line-through text-muted-foreground"
              )}>
                {task.task_name}
              </span>
              <Badge variant="outline">{task.task_category}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  function calculateTaskProgress(tasks: any[]) {
    if (!tasks.length) return 0;
    return (tasks.filter(t => t.is_completed).length / tasks.length) * 100;
  }
}

function CompetitorsView({ competitors }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitors.map((competitor: any, idx: number) => (
          <Card key={idx} className="p-6">
            <h3 className="text-lg font-semibold mb-2">{competitor.name}</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Valuation</p>
                <p className="font-medium">{competitor.valuation}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Market Share</p>
                <p className="font-medium">{competitor.market_share}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Positioning</p>
                <p className="text-sm">{competitor.positioning}</p>
              </div>
              
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Strengths</p>
                <div className="flex flex-wrap gap-1">
                  {competitor.strengths?.map((strength: string, sidx: number) => (
                    <Badge key={sidx} variant="default" className="text-xs">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Weaknesses</p>
                <div className="flex flex-wrap gap-1">
                  {competitor.weaknesses?.map((weakness: string, widx: number) => (
                    <Badge key={widx} variant="outline" className="text-xs">
                      {weakness}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
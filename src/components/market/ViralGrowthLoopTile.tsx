import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  Repeat, TrendingUp, Users, Share2, Target, Zap,
  RefreshCw, ChevronDown, ChevronUp, Sparkles, AlertCircle, ArrowRight
} from 'lucide-react';
import { TileAIChat } from '@/components/hub/TileAIChat';
import { useSession } from '@/contexts/SimpleSessionContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
  FunnelChart, Funnel, Cell, LabelList
} from 'recharts';

interface ViralGrowthLoopTileProps {
  idea?: string;
  ideaContext?: string;
  dataHub?: any;
  className?: string;
  onRefresh?: () => void;
}

interface ViralLoopData {
  kFactor: number;
  invitesPerUser: number;
  inviteConversionRate: number;
  cycleDays: number;
  currentUsers: number;
  loopHealthScore: number;
  projectedGrowth: {
    day30: number;
    day90: number;
    day180: number;
  };
  loopStages: {
    stage: string;
    users: number;
    dropoffRate: number;
  }[];
  optimizations: {
    factor: string;
    currentValue: number;
    targetValue: number;
    impact: string;
    tactics: string[];
  }[];
  viralVelocity: number;
  timeToMillion: number;
}

export function ViralGrowthLoopTile({ 
  idea, 
  ideaContext, 
  dataHub,
  className, 
  onRefresh 
}: ViralGrowthLoopTileProps) {
  const { currentSession } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'calculator' | 'funnel' | 'tactics'>('overview');
  const [viralData, setViralData] = useState<ViralLoopData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  
  // Interactive calculator state
  const [invites, setInvites] = useState(3);
  const [conversion, setConversion] = useState(30);
  
  const currentIdea = useMemo(() => 
    ideaContext || idea || currentSession?.data?.currentIdea || ''
  , [ideaContext, idea, currentSession?.data?.currentIdea]);

  const fetchViralData = async () => {
    if (!currentIdea) {
      toast.error('No idea provided for viral growth analysis');
      return;
    }

    setLoading(true);
    try {
      // For now, use simulated data
      // In production, this would call a Supabase edge function
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockData: ViralLoopData = {
        kFactor: 1.2,
        invitesPerUser: 3,
        inviteConversionRate: 0.4,
        cycleDays: 7,
        currentUsers: 1000,
        loopHealthScore: 78,
        projectedGrowth: {
          day30: 8916,
          day90: 708235,
          day180: 56234132
        },
        loopStages: [
          { stage: 'User Joins', users: 10000, dropoffRate: 0 },
          { stage: 'Sees Value', users: 8500, dropoffRate: 15 },
          { stage: 'Shares/Invites', users: 6000, dropoffRate: 29 },
          { stage: 'Friend Receives', users: 5400, dropoffRate: 10 },
          { stage: 'Friend Converts', users: 2160, dropoffRate: 60 }
        ],
        optimizations: [
          {
            factor: 'Invite Conversion',
            currentValue: 40,
            targetValue: 60,
            impact: '+50% K-Factor',
            tactics: [
              'Add double-sided referral rewards',
              'Personalize invite messages',
              'Optimize invite landing page'
            ]
          },
          {
            factor: 'Invites Per User',
            currentValue: 3,
            targetValue: 5,
            impact: '+67% K-Factor',
            tactics: [
              'Add viral features (sharing, embedding)',
              'Incentivize multiple invites',
              'Make sharing effortless'
            ]
          },
          {
            factor: 'Cycle Time',
            currentValue: 7,
            targetValue: 3,
            impact: '2.3x faster growth',
            tactics: [
              'Reduce onboarding friction',
              'Send timely reminders',
              'Create immediate value moments'
            ]
          }
        ],
        viralVelocity: 1.7,
        timeToMillion: 120
      };
      
      setViralData(mockData);
    } catch (error) {
      console.error('[ViralGrowthLoopTile] Error:', error);
      toast.error('Failed to fetch viral growth data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentIdea && !viralData && !loading) {
      fetchViralData();
    }
  }, [currentIdea]);

  // Calculate K-factor from interactive inputs
  const calculatedKFactor = useMemo(() => {
    return (invites * (conversion / 100)).toFixed(2);
  }, [invites, conversion]);

  const getKFactorStatus = (k: number) => {
    if (k > 1) return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Viral Growth', icon: '🚀' };
    if (k >= 0.7) return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Sustainable', icon: '📈' };
    return { color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Needs Work', icon: '⚠️' };
  };

  const kStatus = viralData ? getKFactorStatus(viralData.kFactor) : getKFactorStatus(parseFloat(calculatedKFactor));

  // Prepare chart data
  const growthProjectionData = viralData ? [
    { day: 0, users: viralData.currentUsers },
    { day: 30, users: viralData.projectedGrowth.day30 },
    { day: 90, users: viralData.projectedGrowth.day90 },
    { day: 180, users: viralData.projectedGrowth.day180 }
  ] : [];

  const funnelData = viralData?.loopStages.map(stage => ({
    ...stage,
    fill: stage.dropoffRate > 50 ? 'hsl(var(--destructive))' : 
          stage.dropoffRate > 25 ? 'hsl(var(--chart-3))' : 
          'hsl(var(--chart-2))'
  })) || [];

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <CardTitle>Viral Growth Loop</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Repeat className="h-8 w-8 mb-3 text-primary animate-spin" />
            <p className="text-sm font-medium animate-pulse">Analyzing viral mechanics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!viralData) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-muted-foreground" />
            Viral Growth Loop
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Button onClick={fetchViralData} disabled={!currentIdea} size="sm" variant="outline">
              <Zap className="h-3 w-3 mr-1" />
              Analyze Viral Potential
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-all duration-300 hover:shadow-lg", className)}>
      <CardHeader className={cn("pb-3", isCollapsed && "border-b-0")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Repeat className="h-5 w-5 text-primary" />
              {viralData.kFactor > 1 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <CardTitle className="text-base font-semibold">Viral Growth Loop</CardTitle>
            <Badge variant="outline" className={cn("text-xs", kStatus.bg, kStatus.color)}>
              {kStatus.icon} K = {viralData.kFactor.toFixed(2)}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIChat(true)}
                className="gap-1 px-3 py-1.5 h-auto whitespace-nowrap text-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">AI Insights</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => fetchViralData()} className="h-7 px-2">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="h-7 px-2">
              {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Viral Loop Health Score */}
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Loop Health Score</span>
              <Badge variant="outline" className={cn(
                viralData.loopHealthScore > 75 ? "bg-emerald-500/10 text-emerald-500" :
                viralData.loopHealthScore > 50 ? "bg-amber-500/10 text-amber-500" :
                "bg-orange-500/10 text-orange-500"
              )}>
                {viralData.loopHealthScore}/100
              </Badge>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${viralData.loopHealthScore}%` }}
              />
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Share2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Invites/User</span>
              </div>
              <p className="text-xl font-bold">{viralData.invitesPerUser}</p>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Target className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Conversion</span>
              </div>
              <p className="text-xl font-bold">{(viralData.inviteConversionRate * 100).toFixed(0)}%</p>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Zap className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Cycle Time</span>
              </div>
              <p className="text-xl font-bold">{viralData.cycleDays}d</p>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">To 1M</span>
              </div>
              <p className="text-xl font-bold">{viralData.timeToMillion}d</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="calculator">Calculator</TabsTrigger>
              <TabsTrigger value="funnel">Funnel</TabsTrigger>
              <TabsTrigger value="tactics">Tactics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Animated Viral Loop Diagram */}
              <div className="bg-muted/10 rounded-lg p-6">
                <h4 className="text-sm font-medium mb-4 text-center">Viral Growth Cycle</h4>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2 animate-pulse">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <span className="text-xs font-medium">User</span>
                  </div>
                  
                  <ArrowRight className="h-5 w-5 text-muted-foreground animate-pulse" />
                  
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                      <Sparkles className="h-8 w-8 text-secondary" />
                    </div>
                    <span className="text-xs font-medium">Value</span>
                  </div>
                  
                  <ArrowRight className="h-5 w-5 text-muted-foreground animate-pulse" style={{ animationDelay: '0.3s' }} />
                  
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-2">
                      <Share2 className="h-8 w-8 text-accent" />
                    </div>
                    <span className="text-xs font-medium">Share</span>
                  </div>
                  
                  <ArrowRight className="h-5 w-5 text-muted-foreground animate-pulse" style={{ animationDelay: '0.6s' }} />
                  
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2 animate-pulse" style={{ animationDelay: '0.9s' }}>
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <span className="text-xs font-medium">New User</span>
                  </div>
                </div>
              </div>

              {/* Growth Projection */}
              <div className="bg-muted/10 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Growth Projection (K = {viralData.kFactor})
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={growthProjectionData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Users', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorUsers)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="calculator" className="space-y-4">
              <div className="bg-muted/10 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-medium">Interactive K-Factor Calculator</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Invites per User: {invites}
                    </label>
                    <Slider 
                      value={[invites]} 
                      onValueChange={(v) => setInvites(v[0])}
                      min={0}
                      max={10}
                      step={0.5}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Conversion Rate: {conversion}%
                    </label>
                    <Slider 
                      value={[conversion]} 
                      onValueChange={(v) => setConversion(v[0])}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Calculated K-Factor</p>
                  <p className="text-5xl font-bold mb-2">{calculatedKFactor}</p>
                  <Badge className={cn("text-xs", getKFactorStatus(parseFloat(calculatedKFactor)).bg)}>
                    {getKFactorStatus(parseFloat(calculatedKFactor)).label}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-3">
                    K = {invites} invites × {conversion}% conversion
                  </p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-400">
                    <p className="font-medium mb-1">Target: K &gt; 1 for viral growth</p>
                    <p>Each user brings in more than 1 new user, creating exponential growth</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="funnel" className="space-y-4">
              <div className="bg-muted/10 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Viral Conversion Funnel</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart>
                    <Tooltip />
                    <Funnel dataKey="users" data={funnelData} isAnimationActive>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList position="right" fill="#000" stroke="none" dataKey="stage" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {viralData.loopStages.map((stage, idx) => (
                    <div key={idx} className="bg-muted/30 rounded p-2">
                      <p className="text-xs font-medium">{stage.stage}</p>
                      <p className="text-sm">{stage.users.toLocaleString()} users</p>
                      {stage.dropoffRate > 0 && (
                        <p className="text-xs text-destructive">-{stage.dropoffRate}% drop-off</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tactics" className="space-y-3">
              {viralData.optimizations.map((opt, idx) => (
                <div key={idx} className="bg-muted/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">{opt.factor}</h4>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                      {opt.impact}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-3 text-sm">
                    <span className="text-muted-foreground">Current: {opt.currentValue}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium">Target: {opt.targetValue}</span>
                  </div>
                  <div className="space-y-1.5">
                    {opt.tactics.map((tactic, tidx) => (
                      <div key={tidx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{tactic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}

      <TileAIChat
        open={showAIChat}
        onOpenChange={setShowAIChat}
        tileData={viralData}
        tileTitle="Viral Growth Loop"
        idea={currentIdea}
      />
    </Card>
  );
}

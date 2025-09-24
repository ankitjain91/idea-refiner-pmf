import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, Activity, Zap, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RefinementData {
  time: string;
  score: number;
  engagement: number;
  refinements: number;
}

interface MetricData {
  subject: string;
  current: number;
  potential: number;
  average: number;
}

interface RealTimeRefinementChartProps {
  idea: string;
  pmfScore: number;
  refinements: {
    budget: string;
    market: string;
    timeline: string;
  };
  metadata?: any; // ChatGPT analysis data
  onRefinementSuggestion?: (suggestion: string) => void;
}

export default function RealTimeRefinementChart({
  idea,
  pmfScore,
  refinements,
  metadata,
  onRefinementSuggestion
}: RealTimeRefinementChartProps) {
  const [chartData, setChartData] = useState<RefinementData[]>([]);
  const [radarData, setRadarData] = useState<MetricData[]>([]);
  const [liveMetrics, setLiveMetrics] = useState({
    activeRefiners: 0,
    avgImprovement: 0,
    trendingDirection: 'up' as 'up' | 'down' | 'stable'
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Initialize chart data
    const initialData: RefinementData[] = [
      { time: '5m ago', score: pmfScore - 15, engagement: 20, refinements: 1 },
      { time: '4m ago', score: pmfScore - 10, engagement: 35, refinements: 2 },
      { time: '3m ago', score: pmfScore - 5, engagement: 45, refinements: 3 },
      { time: '2m ago', score: pmfScore - 2, engagement: 60, refinements: 4 },
      { time: '1m ago', score: pmfScore, engagement: 75, refinements: 5 },
      { time: 'Now', score: pmfScore, engagement: 85, refinements: 6 },
    ];
    setChartData(initialData);

    // Initialize radar data based on ChatGPT metadata or refinements
    const radarMetrics: MetricData[] = metadata?.radarMetrics ? metadata.radarMetrics : [
      { 
        subject: 'Market Fit', 
        current: refinements.market === 'enterprise' ? 90 : refinements.market === 'mainstream' ? 70 : refinements.market === 'niche' ? 60 : 30,
        potential: 95,
        average: 65
      },
      { 
        subject: 'Scalability', 
        current: refinements.budget === 'series-a' ? 85 : refinements.budget === 'seed' ? 70 : 50,
        potential: 90,
        average: 60
      },
      { 
        subject: 'Innovation', 
        current: Math.min(100, pmfScore + 20),
        potential: 100,
        average: 55
      },
      { 
        subject: 'Feasibility', 
        current: refinements.timeline === 'mvp' ? 80 : refinements.timeline === 'full' ? 60 : 70,
        potential: 85,
        average: 70
      },
      { 
        subject: 'Demand', 
        current: Math.min(100, pmfScore + 10),
        potential: 95,
        average: 50
      },
    ];
    setRadarData(radarMetrics);
  }, [pmfScore, refinements, metadata]);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setChartData(prev => {
        const newData = [...prev.slice(1)];
        const lastScore = newData[newData.length - 1]?.score || pmfScore;
        const variation = Math.random() * 4 - 2; // Random variation
        
        newData.push({
          time: 'Now',
          score: Math.min(100, Math.max(0, lastScore + variation)),
          engagement: Math.min(100, 70 + Math.random() * 30),
          refinements: (prev[prev.length - 1]?.refinements || 0) + (Math.random() > 0.7 ? 1 : 0)
        });
        
        return newData;
      });

      // Update live metrics
      setLiveMetrics({
        activeRefiners: Math.floor(3 + Math.random() * 12),
        avgImprovement: Math.floor(5 + Math.random() * 15),
        trendingDirection: Math.random() > 0.7 ? 'up' : Math.random() > 0.4 ? 'stable' : 'down'
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [pmfScore]);

  useEffect(() => {
    // Generate refinement suggestions from ChatGPT metadata or based on score
    if (!idea) return;

    const newSuggestions: string[] = [];
    
    // Use ChatGPT's refinement suggestions if available
    if (metadata?.refinements && Array.isArray(metadata.refinements)) {
      // Add the AI-generated refinements specific to this idea
      newSuggestions.push(...metadata.refinements.slice(0, 4));
    } else {
      // Fallback to generic suggestions based on score and settings
      if (pmfScore < 40) {
        newSuggestions.push(`Consider narrowing your ${idea.includes('parent') || idea.includes('elder') ? 'caregiver demographic' : 'target market'}`);
        newSuggestions.push(`Add unique features for ${idea.includes('volunteer') ? 'volunteer verification' : 'differentiation'}`);
      } else if (pmfScore < 70) {
        newSuggestions.push(`Validate with ${idea.includes('parent') ? 'parent communities' : 'potential customers'}`);
        newSuggestions.push(`Refine your ${idea.includes('care') ? 'care service offerings' : 'value proposition'}`);
      } else {
        newSuggestions.push(`Ready for ${idea.includes('app') ? 'app prototype' : 'MVP'} development`);
        newSuggestions.push(`Consider ${idea.includes('local') ? 'local pilot testing' : 'early user testing'}`);
      }

      // Add context-aware suggestions based on refinements
      if (refinements.budget === 'bootstrapped' && idea.includes('volunteer')) {
        newSuggestions.push("Leverage volunteer networks for organic growth");
      } else if (refinements.budget === 'bootstrapped') {
        newSuggestions.push("Focus on organic growth strategies");
      }
      
      if (refinements.market === 'enterprise' && idea.includes('care')) {
        newSuggestions.push("Build HIPAA compliance for healthcare data");
      } else if (refinements.market === 'enterprise') {
        newSuggestions.push("Build compliance and security features");
      }
      
      if (idea.includes('elder') || idea.includes('senior')) {
        newSuggestions.push("Ensure accessibility features for elderly users");
      }
      
      if (idea.includes('parent') && idea.includes('assist')) {
        newSuggestions.push("Add background check integration for safety");
      }
    }

    setSuggestions(newSuggestions.slice(0, 4)); // Limit to 4 suggestions
  }, [idea, pmfScore, refinements, metadata]);

  // Set up real-time collaboration channel
  useEffect(() => {
    const channel = supabase.channel('refinement-updates');
    
    channel
      .on('broadcast', { event: 'refinement' }, ({ payload }) => {
        console.log('Received refinement update:', payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg p-3">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-border/50 bg-card/95 backdrop-blur-xl animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Real-Time Refinement Analytics
            </CardTitle>
            <CardDescription>
              Live insights and optimization metrics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {liveMetrics.activeRefiners} Active
            </Badge>
            <Badge 
              variant={liveMetrics.trendingDirection === 'up' ? 'default' : 'secondary'}
              className="flex items-center gap-1"
            >
              <TrendingUp className={`w-3 h-3 ${liveMetrics.trendingDirection === 'up' ? 'animate-pulse' : ''}`} />
              +{liveMetrics.avgImprovement}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Line Chart - Score Progress */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            PMF Score Evolution
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="hsl(var(--primary))" 
                fill="url(#scoreGradient)"
                strokeWidth={2}
                name="PMF Score"
              />
              <Area 
                type="monotone" 
                dataKey="engagement" 
                stroke="hsl(var(--secondary))" 
                fill="url(#engagementGradient)"
                strokeWidth={2}
                name="Engagement"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart - Multi-dimensional Analysis */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Multidimensional Analysis</h4>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeDasharray="3 3"
              />
              <PolarAngleAxis 
                dataKey="subject" 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <Radar 
                name="Current" 
                dataKey="current" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.4}
                strokeWidth={2}
              />
              <Radar 
                name="Potential" 
                dataKey="potential" 
                stroke="hsl(var(--secondary))" 
                fill="hsl(var(--secondary))" 
                fillOpacity={0.2}
                strokeWidth={1}
                strokeDasharray="5 5"
              />
              <Radar 
                name="Market Avg" 
                dataKey="average" 
                stroke="hsl(var(--muted-foreground))" 
                fill="hsl(var(--muted-foreground))" 
                fillOpacity={0.1}
                strokeWidth={1}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Suggestions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">AI-Powered Suggestions</h4>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-primary/5 border border-primary/10 hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => onRefinementSuggestion?.(suggestion)}
              >
                <p className="text-sm flex items-center gap-2">
                  <Zap className="w-3 h-3 text-primary" />
                  {suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
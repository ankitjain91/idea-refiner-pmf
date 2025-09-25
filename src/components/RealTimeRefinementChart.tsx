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
    // Generate dynamic refinement suggestions from ChatGPT metadata or based on context
    if (!idea) return;

    const generateDynamicSuggestions = () => {
      const allSuggestions: string[] = [];
      
      // Use ChatGPT's refinement suggestions if available
      if (metadata?.refinements && Array.isArray(metadata.refinements)) {
        const normalized = metadata.refinements.map((r: any) =>
          typeof r === 'string' ? r : (r.title || r.description || JSON.stringify(r))
        );
        allSuggestions.push(...normalized);
      }
      
      // Add contextual suggestions based on the idea content
      const ideaLower = idea.toLowerCase();
      
      // Parent/Elder care specific suggestions
      if (ideaLower.includes('parent') || ideaLower.includes('elder') || ideaLower.includes('care')) {
        allSuggestions.push(
          "Implement emergency contact system for urgent care needs",
          "Add caregiver rating and review system",
          "Create scheduling system for regular care visits",
          "Integrate health monitoring and reporting features",
          "Build trust through background verification process",
          "Add insurance and liability coverage options",
          "Create care plan templates for different needs",
          "Implement real-time location tracking for safety"
        );
      }
      
      // Volunteer specific suggestions
      if (ideaLower.includes('volunteer')) {
        allSuggestions.push(
          "Gamify volunteer hours with achievement badges",
          "Create volunteer skill matching algorithm",
          "Add volunteer hour tracking for certificates",
          "Build community recognition system",
          "Implement volunteer screening and training modules",
          "Create volunteer-family matching preferences",
          "Add volunteer availability calendar system",
          "Build volunteer impact dashboard"
        );
      }
      
      // App/Platform specific suggestions
      if (ideaLower.includes('app') || ideaLower.includes('platform')) {
        allSuggestions.push(
          "Optimize mobile UI for elderly users",
          "Add offline mode for essential features",
          "Implement push notifications for care reminders",
          "Create family member access portal",
          "Add voice commands for accessibility",
          "Build integration with medical systems",
          "Create automated matching algorithms",
          "Add multi-language support for diverse communities"
        );
      }
      
      // Score-based strategic suggestions
      if (pmfScore < 50) {
        allSuggestions.push(
          "Conduct user interviews with 20+ target users",
          "Run A/B testing on value propositions",
          "Create detailed user journey maps",
          "Analyze competitor weaknesses and gaps",
          "Test pricing models with focus groups",
          "Build minimum lovable product first"
        );
      } else if (pmfScore < 75) {
        allSuggestions.push(
          "Launch beta program with 100 early adopters",
          "Set up analytics for user behavior tracking",
          "Create referral program for growth",
          "Build automated onboarding flow",
          "Implement customer feedback loops",
          "Develop content marketing strategy"
        );
      } else {
        allSuggestions.push(
          "Scale infrastructure for 10x growth",
          "Explore partnership opportunities",
          "Consider geographic expansion strategy",
          "Build API for third-party integrations",
          "Implement advanced analytics dashboard",
          "Prepare for Series A fundraising"
        );
      }
      
      // Market-specific suggestions
      if (refinements.market === 'enterprise') {
        allSuggestions.push(
          "Add SSO and enterprise authentication",
          "Build comprehensive admin dashboard",
          "Create SLA and support tiers",
          "Implement audit logs and compliance"
        );
      } else if (refinements.market === 'mainstream') {
        allSuggestions.push(
          "Simplify onboarding to under 2 minutes",
          "Create viral sharing mechanisms",
          "Build freemium model with clear upgrade path",
          "Add social proof and testimonials"
        );
      }
      
      // Budget-specific suggestions
      if (refinements.budget === 'bootstrapped') {
        allSuggestions.push(
          "Focus on SEO and organic acquisition",
          "Build in public for community growth",
          "Use no-code tools for rapid prototyping",
          "Partner with complementary services"
        );
      } else if (refinements.budget === 'seed' || refinements.budget === 'series-a') {
        allSuggestions.push(
          "Hire key technical talent",
          "Invest in paid acquisition channels",
          "Build robust data infrastructure",
          "Expand to adjacent markets"
        );
      }
      
      // Randomly select 4 different suggestions each time
      const shuffled = allSuggestions.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 4);
    };

    setSuggestions(generateDynamicSuggestions());
  }, [idea, pmfScore, refinements, metadata]);
  
  // Refresh suggestions periodically for variety
  useEffect(() => {
    if (!idea) return;
    
    const refreshInterval = setInterval(() => {
      const ideaLower = idea.toLowerCase();
      const contextualSuggestions: string[] = [];
      
      // Generate fresh contextual suggestions
      const timestamp = Date.now();
      const variant = (timestamp % 5); // Create 5 different variants
      
      if (ideaLower.includes('parent') || ideaLower.includes('care')) {
        const careSuggestions = [
          ["Partner with local healthcare providers", "Create care coordination features", "Add medication reminder system", "Build caregiver support groups"],
          ["Integrate telehealth consultations", "Add daily check-in system", "Create care cost calculator", "Build respite care network"],
          ["Add activity suggestions for seniors", "Create cognitive exercise features", "Build nutrition tracking", "Add fall detection system"],
          ["Create care team collaboration tools", "Add transportation coordination", "Build care quality metrics", "Create family update system"],
          ["Add legal document storage", "Create care preference profiles", "Build emergency response system", "Add social engagement features"]
        ];
        contextualSuggestions.push(...careSuggestions[variant]);
      } else if (metadata?.refinements && Array.isArray(metadata.refinements)) {
        // Rotate through ChatGPT suggestions with variations
        const base = metadata.refinements.map((r: any) =>
          typeof r === 'string' ? r : (r.title || r.description || JSON.stringify(r))
        );
        const rotated = [...base];
        for (let i = 0; i < variant; i++) {
          rotated.push(rotated.shift()!);
        }
        contextualSuggestions.push(...rotated.slice(0, 4));
      } else {
        // Generic business suggestions that rotate
        const genericSuggestions = [
          ["Define clear success metrics", "Build user feedback system", "Create growth experiments", "Test market assumptions"],
          ["Optimize conversion funnel", "Build retention features", "Create viral loops", "Add engagement metrics"],
          ["Develop pricing strategy", "Build customer segments", "Create value matrix", "Add competitive analysis"],
          ["Build product roadmap", "Create feature prioritization", "Add user analytics", "Develop go-to-market plan"],
          ["Create brand identity", "Build community features", "Add referral system", "Develop content strategy"]
        ];
        contextualSuggestions.push(...genericSuggestions[variant]);
      }
      
      setSuggestions(contextualSuggestions.slice(0, 4));
    }, 8000); // Refresh every 8 seconds
    
    return () => clearInterval(refreshInterval);
  }, [idea, metadata]);

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
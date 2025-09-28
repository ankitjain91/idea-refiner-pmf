import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";
import { TrendingUp, TrendingDown, Users, Globe, Target, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface MarketValidationProps {
  idea: string;
}

export function MarketValidation({ idea }: MarketValidationProps) {
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState<any>(null);
  const [competitors, setCompetitors] = useState<any>(null);
  const [pmfScore, setPmfScore] = useState(65);
  const [sliders, setSliders] = useState({
    pricing: 50,
    geography: 30,
    niche: 70
  });

  useEffect(() => {
    if (idea) {
      fetchMarketData();
    }
  }, [idea]);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      // Fetch market trends
      const [trendsRes, competitorsRes] = await Promise.all([
        supabase.functions.invoke('market-trends', {
          body: { idea, keywords: idea.split(' ').slice(0, 3) }
        }),
        supabase.functions.invoke('competitor-analysis', {
          body: { idea }
        })
      ]);

      if (trendsRes.data) setMarketData(trendsRes.data.trends);
      if (competitorsRes.data) setCompetitors(competitorsRes.data.competitors);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePMFScore = () => {
    const baseScore = pmfScore;
    const pricingImpact = (sliders.pricing - 50) * 0.2;
    const geoImpact = (sliders.geography - 30) * 0.15;
    const nicheImpact = (sliders.niche - 70) * 0.1;
    return Math.min(100, Math.max(0, baseScore + pricingImpact + geoImpact + nicheImpact));
  };

  const pmfData = [
    { name: 'Score', value: calculatePMFScore(), fill: 'hsl(var(--primary))' }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card/50 backdrop-blur">
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Trends Card */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Search Trends
              <HoverCard>
                <HoverCardTrigger>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </HoverCardTrigger>
                <HoverCardContent>
                  <p className="text-sm">Shows search volume trends over time. Growing trends indicate increasing market interest.</p>
                </HoverCardContent>
              </HoverCard>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {marketData?.searchVolume && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{marketData.searchVolume.monthlyVolume?.toLocaleString()}</span>
                  {marketData.searchVolume.trend === 'growing' ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <Badge variant={marketData.searchVolume.trend === 'growing' ? 'default' : 'secondary'}>
                  {marketData.searchVolume.growthRate}% growth
                </Badge>
                <ResponsiveContainer width="100%" height={60}>
                  <AreaChart data={marketData.trendData || []}>
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competitor Landscape Card */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Competitor Landscape
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {competitors?.topCompetitors && (
              <div className="space-y-3">
                {competitors.topCompetitors.slice(0, 3).map((comp: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                        {comp.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{comp.name}</p>
                        <p className="text-xs text-muted-foreground">{comp.fundingStage}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {comp.tractionScore}/100
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target Audience Fit Card */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Target Audience Fit
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Age: 25-34</span>
                <Badge variant="default">Primary</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Geography: US/EU</span>
                <Badge variant="secondary">85% match</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Market Fit</span>
                  <span>78%</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PM Fit Score Gauge */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              PM Fit Score
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ResponsiveContainer width="100%" height={80}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={pmfData}>
                  <RadialBar dataKey="value" cornerRadius={10} fill="hsl(var(--primary))" />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="text-center">
                <span className="text-2xl font-bold">{Math.round(calculatePMFScore())}%</span>
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Pricing</span>
                    <span>${sliders.pricing}</span>
                  </div>
                  <Slider
                    value={[sliders.pricing]}
                    onValueChange={([value]) => setSliders(s => ({ ...s, pricing: value }))}
                    max={100}
                    step={10}
                    className="cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Geography</span>
                    <span>{sliders.geography} countries</span>
                  </div>
                  <Slider
                    value={[sliders.geography]}
                    onValueChange={([value]) => setSliders(s => ({ ...s, geography: value }))}
                    max={100}
                    step={10}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Social Mentions */}
      {marketData?.socialMentions && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Social Mentions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">{marketData.socialMentions.reddit}</p>
                <p className="text-sm text-muted-foreground">Reddit</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{marketData.socialMentions.twitter}</p>
                <p className="text-sm text-muted-foreground">Twitter</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-pink-500">{marketData.socialMentions.tiktok}</p>
                <p className="text-sm text-muted-foreground">TikTok</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
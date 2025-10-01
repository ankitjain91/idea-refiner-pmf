import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { DollarSign, TrendingUp, Award, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { AlertCircle } from "lucide-react";
import { extractEdgeFunctionData } from "@/utils/edgeFunctionUtils";

interface FinancialSignalsProps {
  idea: string;
}

export function FinancialSignals({ idea }: FinancialSignalsProps) {
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState<any>(null);

  useEffect(() => {
    if (idea) {
      fetchFinancialData();
    }
  }, [idea]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('financial-analysis', {
        body: { idea }
      });

      // Extract data using the utility function
      const extractedData = extractEdgeFunctionData({ data, error }, 'financials');
      if (extractedData) {
        setFinancials(extractedData);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const marketSizeData = financials?.marketSize ? [
    { name: 'TAM', value: financials.marketSize.TAM.value / 1000000000, label: financials.marketSize.TAM.label },
    { name: 'SAM', value: financials.marketSize.SAM.value / 1000000000, label: financials.marketSize.SAM.label },
    { name: 'SOM', value: financials.marketSize.SOM.value / 1000000000, label: financials.marketSize.SOM.label },
  ] : [];

  const unitEconomicsData = financials?.unitEconomics ? [
    { name: 'CAC', value: financials.unitEconomics.CAC.value, type: 'cost' },
    { name: 'LTV', value: financials.unitEconomics.LTV.value, type: 'revenue' }
  ] : [];

  const revenueProjectionData = financials?.revenueProjections ? [
    { year: 'Year 1', revenue: financials.revenueProjections.year1 / 1000000 },
    { year: 'Year 2', revenue: financials.revenueProjections.year2 / 1000000 },
    { year: 'Year 3', revenue: financials.revenueProjections.year3 / 1000000 }
  ] : [];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--primary) / 0.7)', 'hsl(var(--primary) / 0.4)'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Market Potential Chart */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Market Potential
              <HoverCard>
                <HoverCardTrigger>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </HoverCardTrigger>
                <HoverCardContent>
                  <p className="text-sm">TAM: Total Addressable Market - The total market demand</p>
                  <p className="text-sm mt-1">SAM: Serviceable Addressable Market - Your reachable market</p>
                  <p className="text-sm mt-1">SOM: Serviceable Obtainable Market - Realistic capture</p>
                </HoverCardContent>
              </HoverCard>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={marketSizeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {marketSizeData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${value}B`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-around mt-4">
              {marketSizeData.map((item: any, idx: number) => (
                <div key={idx} className="text-center">
                  <div className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </div>
                  <p className="text-sm font-bold">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Unit Economics Card */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Unit Economics
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={unitEconomicsData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${value}`} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {financials?.unitEconomics && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">LTV:CAC Ratio</span>
                  <Badge variant={financials.unitEconomics.LTVtoCACRatio > 3 ? "default" : "secondary"}>
                    {financials.unitEconomics.LTVtoCACRatio}:1
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payback Period</span>
                  <span className="text-sm font-medium">{financials.unitEconomics.paybackPeriod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Gross Margin</span>
                  <span className="text-sm font-medium">{financials.unitEconomics.grossMargin}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Projections */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Revenue Projections
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={revenueProjectionData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${value}M`} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
            {financials?.revenueProjections && (
              <div className="mt-4 text-center">
                <Badge variant="default" className="text-lg">
                  {financials.revenueProjections.growthRate}% Growth Rate
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Funding & Success Stories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Funding Card */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              Recent Funding Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {financials?.recentFunding?.slice(0, 3).map((funding: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <div>
                    <p className="font-medium">{funding.company}</p>
                    <p className="text-sm text-muted-foreground">{funding.stage} • {funding.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{funding.amount}</p>
                    <p className="text-xs text-muted-foreground">{funding.valuation}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Success Stories Card */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Comparable Success Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {financials?.successStories?.slice(0, 3).map((story: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{story.company}</p>
                    <Badge variant={story.exit === 'IPO' ? 'default' : 'secondary'}>
                      {story.exit}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{story.timeline}</span>
                    <span className="font-bold text-primary">{story.value}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {story.keyFactors?.slice(0, 2).map((factor: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Globe, Users, DollarSign, Target, ChartBar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface MarketSizeChartProps {
  data: any;
}

export function MarketSizeChart({ data }: MarketSizeChartProps) {
  if (!data) return null;

  // Parse market size data
  const tam = parseFloat(data.tam?.replace(/[^0-9.]/g, '') || '0');
  const sam = parseFloat(data.sam?.replace(/[^0-9.]/g, '') || '0');
  const som = parseFloat(data.som?.replace(/[^0-9.]/g, '') || '0');

  const marketData = [
    { name: 'TAM', value: tam, color: 'hsl(var(--chart-1))', description: 'Total Addressable Market' },
    { name: 'SAM', value: sam, color: 'hsl(var(--chart-2))', description: 'Serviceable Available Market' },
    { name: 'SOM', value: som, color: 'hsl(var(--chart-3))', description: 'Serviceable Obtainable Market' }
  ];

  const segmentData = data.customer_segments?.map((segment: any, index: number) => ({
    segment: segment.segment,
    size: parseFloat(segment.size?.replace(/[^0-9.]/g, '') || '0'),
    growth: parseFloat(segment.growth_rate?.replace(/[^0-9.]/g, '') || '0'),
    color: `hsl(var(--chart-${(index % 5) + 1}))`
  })) || [];

  const competitiveData = [
    { subject: 'Market Size', A: tam / 100, B: sam / 100, fullMark: tam / 100 },
    { subject: 'Growth Rate', A: parseFloat(data.cagr?.replace(/[^0-9.]/g, '') || '15'), B: 10, fullMark: 30 },
    { subject: 'Competition', A: 60, B: 80, fullMark: 100 },
    { subject: 'Entry Barriers', A: 40, B: 70, fullMark: 100 },
    { subject: 'Profitability', A: 75, B: 60, fullMark: 100 }
  ];

  return (
    <div className="space-y-6">
      {/* Market Size Overview */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ChartBar className="h-5 w-5 text-primary" />
              Market Size Breakdown
            </CardTitle>
            <Badge variant="secondary" className="bg-primary/10">
              {data.cagr || '15%'} CAGR
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={marketData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value}B`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {marketData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Market Metrics */}
            <div className="space-y-4">
              {marketData.map((market) => (
                <div key={market.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: market.color }} />
                      <span className="font-medium">{market.name}</span>
                    </div>
                    <span className="text-2xl font-bold">${market.value}B</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{market.description}</p>
                  <Progress value={(market.value / tam) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Segments */}
      {segmentData.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Customer Segments Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={segmentData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="segment" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="size" fill="hsl(var(--chart-1))" name="Market Size ($B)" />
                <Bar dataKey="growth" fill="hsl(var(--chart-2))" name="Growth Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Competitive Landscape */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Competitive Landscape Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={competitiveData}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis dataKey="subject" className="text-xs" />
              <PolarRadiusAxis className="text-xs" />
              <Radar name="Your Opportunity" dataKey="A" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.6} />
              <Radar name="Market Average" dataKey="B" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="border-border/50 bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            AI-Powered Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Geographic Opportunity</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Primary markets in {data.assumptions?.target_market || 'North America and Europe'} with expansion potential in emerging markets.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Revenue Potential</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Estimated ${som}B obtainable market with {data.cagr || '15%'} annual growth trajectory.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
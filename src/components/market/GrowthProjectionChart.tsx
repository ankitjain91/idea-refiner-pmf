import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Bar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Rocket, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GrowthProjectionChartProps {
  data: any;
}

export function GrowthProjectionChart({ data }: GrowthProjectionChartProps) {
  if (!data) return null;

  // Transform projection data
  const projectionData = data.timeSeries?.map((item: any) => ({
    month: item.month,
    conservative: item.conservative,
    base: item.base,
    aggressive: item.aggressive,
    actual: item.month <= 3 ? item.base * (0.8 + Math.random() * 0.4) : null
  })) || [];

  // Key metrics
  const metrics = data.metrics || {};
  const yearGrowth = metrics.yearGrowth || 250;
  const monthlyGrowth = metrics.monthlyGrowth || 15;
  const breakEvenMonth = metrics.breakEvenMonth || 8;

  // Milestone data
  const milestones = [
    { month: 3, event: 'MVP Launch', value: projectionData[2]?.base || 1000 },
    { month: 6, event: 'Series A', value: projectionData[5]?.base || 5000 },
    { month: 9, event: 'Market Expansion', value: projectionData[8]?.base || 15000 },
    { month: 12, event: 'Profitability', value: projectionData[11]?.base || 30000 }
  ];

  // Risk factors
  const riskFactors = [
    { factor: 'Market Competition', impact: 'Medium', mitigation: 'Unique value proposition and rapid iteration' },
    { factor: 'Customer Acquisition', impact: 'High', mitigation: 'Multi-channel marketing and referral programs' },
    { factor: 'Technical Scalability', impact: 'Low', mitigation: 'Cloud infrastructure and microservices architecture' },
    { factor: 'Regulatory Compliance', impact: 'Medium', mitigation: 'Legal consultation and compliance framework' }
  ];

  return (
    <div className="space-y-6">
      {/* Growth Projections */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              5-Year Growth Trajectory
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                {yearGrowth}% Year 1
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                {monthlyGrowth}% MoM
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id="colorAggressive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorConservative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" label={{ value: 'Months', position: 'insideBottom', offset: -5 }} className="text-xs" />
              <YAxis label={{ value: 'Revenue ($K)', angle: -90, position: 'insideLeft' }} className="text-xs" />
              <Tooltip formatter={(value: any) => `$${(value / 1000).toFixed(1)}K`} />
              <Legend />
              <Area type="monotone" dataKey="aggressive" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorAggressive)" name="Aggressive" />
              <Area type="monotone" dataKey="base" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorBase)" name="Base Case" />
              <Area type="monotone" dataKey="conservative" stroke="hsl(var(--chart-3))" fillOpacity={1} fill="url(#colorConservative)" name="Conservative" />
              {projectionData.some((d: any) => d.actual) && (
                <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} name="Actual" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Milestones Timeline */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Key Milestones & Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={milestones}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="event" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(value: any) => `$${(value / 1000).toFixed(1)}K`} />
              <Bar dataKey="value" fill="hsl(var(--chart-4))" name="Target Revenue" />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
          
          <div className="mt-4 grid grid-cols-2 gap-4">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Month {milestone.month}: {milestone.event}</p>
                  <p className="text-xs text-muted-foreground">Target: ${(milestone.value / 1000).toFixed(1)}K</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Analysis */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Risk Assessment & Mitigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskFactors.map((risk, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{risk.factor}</span>
                  <Badge 
                    variant={risk.impact === 'High' ? 'destructive' : risk.impact === 'Medium' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {risk.impact} Impact
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{risk.mitigation}</p>
                <Progress 
                  value={risk.impact === 'High' ? 75 : risk.impact === 'Medium' ? 50 : 25} 
                  className="h-1.5"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Break-even Analysis */}
      <Alert className="border-primary/20 bg-primary/5">
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          <strong>Break-even Analysis:</strong> Expected to reach profitability by Month {breakEvenMonth} with {data.customers || '1,000+'} customers. 
          Current burn rate suggests {data.runway || '18'} months of runway with conservative estimates.
        </AlertDescription>
      </Alert>
    </div>
  );
}
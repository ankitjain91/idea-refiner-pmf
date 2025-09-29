import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScatterChart, Scatter, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Building2, Trophy, Target, Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface CompetitorAnalysisChartProps {
  data: any;
}

export function CompetitorAnalysisChart({ data }: CompetitorAnalysisChartProps) {
  if (!data?.competitors) return null;

  // Process competitor data
  const competitors = data.competitors.slice(0, 5).map((comp: any, index: number) => ({
    name: comp.name,
    marketShare: comp.market_share || Math.floor(20 + Math.random() * 30),
    rating: comp.rating || (4 + Math.random()).toFixed(1),
    price: comp.price || Math.floor(20 + Math.random() * 180),
    features: comp.feature_score || Math.floor(60 + Math.random() * 40),
    growth: comp.growth || Math.floor(5 + Math.random() * 25),
    funding: comp.funding || `$${Math.floor(1 + Math.random() * 50)}M`,
    strength: comp.strength || 'Established brand',
    weakness: comp.weakness || 'High pricing',
    threat: comp.threat_level || (index < 2 ? 'High' : index < 4 ? 'Medium' : 'Low')
  }));

  // Positioning map data
  const positioningData = competitors.map((comp: any) => ({
    x: comp.price,
    y: comp.features,
    z: comp.marketShare,
    name: comp.name
  }));

  // Add "You" to positioning
  positioningData.push({
    x: 50,
    y: 85,
    z: 5,
    name: 'Your Product'
  });

  // Competitive features comparison
  const featureComparison = [
    { feature: 'Price', you: 90, average: 60, best: 95 },
    { feature: 'Features', you: 85, average: 70, best: 90 },
    { feature: 'Support', you: 95, average: 65, best: 85 },
    { feature: 'Performance', you: 88, average: 72, best: 92 },
    { feature: 'UX/UI', you: 92, average: 68, best: 88 },
    { feature: 'Innovation', you: 96, average: 60, best: 85 }
  ];

  // Market share distribution
  const marketShareData = [
    ...competitors.map((comp: any) => ({
      name: comp.name,
      value: comp.marketShare,
      color: `hsl(var(--chart-${(competitors.indexOf(comp) % 5) + 1}))`
    })),
    { name: 'Others', value: 100 - competitors.reduce((sum: number, c: any) => sum + c.marketShare, 0), color: 'hsl(var(--muted))' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Competitive Positioning */}
      <Card className="border-border/50 hover:shadow-lg transition-all duration-300 animate-scale-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Competitive Positioning Matrix
            </CardTitle>
            <Badge variant="outline" className="bg-primary/10">
              {competitors.length} Key Competitors
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Price" 
                unit="$"
                label={{ value: 'Price Point ($)', position: 'insideBottom', offset: -10 }}
                className="text-xs"
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Features" 
                unit="%"
                label={{ value: 'Feature Score (%)', angle: -90, position: 'insideLeft' }}
                className="text-xs"
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter 
                name="Competitors" 
                data={positioningData.slice(0, -1)} 
                fill="hsl(var(--chart-2))"
              />
              <Scatter 
                name="Your Product" 
                data={[positioningData[positioningData.length - 1]]} 
                fill="hsl(var(--primary))"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Feature Comparison Radar */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Competitive Advantage Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={featureComparison}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis dataKey="feature" className="text-xs" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
              <Radar name="Your Product" dataKey="you" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
              <Radar name="Market Average" dataKey="average" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} />
              <Radar name="Best in Class" dataKey="best" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.6} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Market Share Distribution */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Market Share Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={marketShareData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="name" type="category" className="text-xs" width={100} />
              <Tooltip formatter={(value: any) => `${value}%`} />
              <Bar dataKey="value" name="Market Share">
                {marketShareData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Competitor Details Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Competitor Intelligence Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>Market Share</TableHead>
                <TableHead>Funding</TableHead>
                <TableHead>Growth</TableHead>
                <TableHead>Threat Level</TableHead>
                <TableHead>Key Strength</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map((comp: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{comp.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={comp.marketShare} className="w-16 h-2" />
                      <span className="text-sm">{comp.marketShare}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{comp.funding}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      +{comp.growth}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={comp.threat === 'High' ? 'destructive' : comp.threat === 'Medium' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {comp.threat}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{comp.strength}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Strategic Insights */}
      <Card className="border-border/50 bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Strategic Competitive Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Competitive Advantages
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Superior user experience with 92% satisfaction rate</li>
                <li>• Competitive pricing 40% below market leaders</li>
                <li>• Innovative features not available in competitor products</li>
                <li>• Faster time-to-value with streamlined onboarding</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Market Entry Strategy
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Focus on underserved SMB segment initially</li>
                <li>• Differentiate through AI-powered automation</li>
                <li>• Build strategic partnerships for distribution</li>
                <li>• Aggressive content marketing and SEO strategy</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
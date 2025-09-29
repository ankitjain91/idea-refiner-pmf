import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Users, Target, Globe, Heart, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TargetAudienceChartProps {
  data: any;
}

export function TargetAudienceChart({ data }: TargetAudienceChartProps) {
  if (!data) return null;

  // Demographics data
  const demographics = data.demographics || {
    age: [
      { range: '18-24', percentage: 15, color: 'hsl(var(--chart-1))' },
      { range: '25-34', percentage: 35, color: 'hsl(var(--chart-2))' },
      { range: '35-44', percentage: 30, color: 'hsl(var(--chart-3))' },
      { range: '45-54', percentage: 15, color: 'hsl(var(--chart-4))' },
      { range: '55+', percentage: 5, color: 'hsl(var(--chart-5))' }
    ],
    gender: [
      { type: 'Male', value: 45, color: 'hsl(var(--chart-1))' },
      { type: 'Female', value: 52, color: 'hsl(var(--chart-2))' },
      { type: 'Other', value: 3, color: 'hsl(var(--chart-3))' }
    ],
    location: [
      { region: 'North America', users: 40 },
      { region: 'Europe', users: 30 },
      { region: 'Asia Pacific', users: 20 },
      { region: 'Latin America', users: 7 },
      { region: 'Africa', users: 3 }
    ]
  };

  // Psychographics data
  const psychographics = data.psychographics || [
    { trait: 'Tech-Savvy', score: 85 },
    { trait: 'Early Adopter', score: 78 },
    { trait: 'Price Conscious', score: 65 },
    { trait: 'Quality Focused', score: 92 },
    { trait: 'Brand Loyal', score: 58 },
    { trait: 'Social Influence', score: 73 }
  ];

  // User personas
  const personas = data.personas || [
    {
      name: 'Sarah Chen',
      role: 'Product Manager',
      age: 32,
      income: '$85K',
      goals: ['Streamline workflows', 'Team collaboration', 'Data-driven decisions'],
      painPoints: ['Time management', 'Tool fragmentation', 'Reporting complexity'],
      avatar: 'SC'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Startup Founder',
      age: 28,
      income: '$60K',
      goals: ['Scale business', 'Reduce costs', 'Automate processes'],
      painPoints: ['Limited resources', 'Technical complexity', 'Market competition'],
      avatar: 'MR'
    },
    {
      name: 'Emily Thompson',
      role: 'Marketing Director',
      age: 38,
      income: '$120K',
      goals: ['ROI optimization', 'Customer insights', 'Campaign automation'],
      painPoints: ['Attribution tracking', 'Data silos', 'Resource allocation'],
      avatar: 'ET'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Demographics Overview */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Demographic Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Age Distribution */}
            <div>
              <h4 className="text-sm font-medium mb-3">Age Groups</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={demographics.age}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="percentage"
                  >
                    {demographics.age.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {demographics.age.map((age: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: age.color }} />
                      <span>{age.range}</span>
                    </div>
                    <span className="font-medium">{age.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gender Distribution */}
            <div>
              <h4 className="text-sm font-medium mb-3">Gender Split</h4>
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="90%" data={demographics.gender}>
                  <RadialBar dataKey="value" cornerRadius={10} fill="hsl(var(--primary))" />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {demographics.gender.map((gender: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-xs">{gender.type}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={gender.value} className="w-20 h-2" />
                      <span className="text-xs font-medium">{gender.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geographic Distribution */}
            <div>
              <h4 className="text-sm font-medium mb-3">Geographic Reach</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={demographics.location}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="region" className="text-xs" angle={-45} textAnchor="end" height={60} />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value: any) => `${value}%`} />
                  <Bar dataKey="users" fill="hsl(var(--chart-4))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Psychographics */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Psychographic Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {psychographics.map((trait: any, index: number) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{trait.trait}</span>
                  <span className="text-sm text-muted-foreground">{trait.score}%</span>
                </div>
                <Progress value={trait.score} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Personas */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Primary User Personas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {personas.map((persona: any, index: number) => (
              <div key={index} className="p-4 rounded-lg border border-border/50 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {persona.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{persona.name}</h4>
                    <p className="text-xs text-muted-foreground">{persona.role}</p>
                  </div>
                </div>
                
                <div className="flex gap-4 text-xs">
                  <span className="text-muted-foreground">Age: {persona.age}</span>
                  <span className="text-muted-foreground">Income: {persona.income}</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium mb-1">Goals</p>
                    <ul className="space-y-0.5">
                      {persona.goals.map((goal: string, gIndex: number) => (
                        <li key={gIndex} className="text-xs text-muted-foreground">• {goal}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium mb-1">Pain Points</p>
                    <ul className="space-y-0.5">
                      {persona.painPoints.map((pain: string, pIndex: number) => (
                        <li key={pIndex} className="text-xs text-muted-foreground">• {pain}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audience Insights */}
      <Card className="border-border/50 bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Audience Intelligence Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Market Segments
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Primary: Tech-forward SMBs (45% of TAM)</li>
                <li>• Secondary: Enterprise early adopters (30% of TAM)</li>
                <li>• Tertiary: Individual professionals (25% of TAM)</li>
                <li>• Highest LTV: Enterprise segment ($15K/year)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Engagement Strategy
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Content marketing for 25-34 demographic</li>
                <li>• LinkedIn for B2B decision makers</li>
                <li>• Product-led growth for tech-savvy users</li>
                <li>• Referral programs leveraging social influence</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Calendar, Briefcase, TrendingUp, Sparkles, ChevronUp, ChevronDown, Crown } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DemographicsAnalysisProps {
  idea: string;
  market: string;
  metadata?: any; // ChatGPT analysis data
}

interface Demographics {
  ageGroups: Array<{ range: string; percentage: number; color: string }>;
  ageGroupsExplanation: string;
  locations: Array<{ name: string; percentage: number; type: string }>;
  locationsExplanation: string;
  occupations: Array<{ title: string; percentage: number; income: string }>;
  occupationsExplanation: string;
  behaviors: Array<{ behavior: string; frequency: string; impact: 'High' | 'Medium' | 'Low' }>;
  behaviorsExplanation: string;
}

export default function DemographicsAnalysis({ idea, market, metadata }: DemographicsAnalysisProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  const generateDemographics = (): Demographics => {
    const isEnterprise = market === 'enterprise';
    const isMass = market === 'mass';
    
    // Use ChatGPT data if available
    const targetAge = metadata?.targetAge || (isEnterprise ? '35-44' : isMass ? '18-34' : '22-30');
    const interests = metadata?.interests || [];
    const incomeRange = metadata?.incomeRange || '$60k-100k';
    const marketSize = metadata?.marketSize || '$2.5B';
    const competition = metadata?.competition || 'Medium';
    
    // Parse age range to create distribution
    const getAgeDistribution = () => {
      if (targetAge.includes('18') || targetAge.includes('25-35')) {
        return [
          { range: '18-24', percentage: 20, color: '#8b5cf6' },
          { range: '25-34', percentage: 45, color: '#3b82f6' },
          { range: '35-44', percentage: 25, color: '#10b981' },
          { range: '45+', percentage: 10, color: '#f59e0b' }
        ];
      } else if (targetAge.includes('25-45')) {
        return [
          { range: '25-34', percentage: 35, color: '#8b5cf6' },
          { range: '35-44', percentage: 40, color: '#3b82f6' },
          { range: '45-54', percentage: 20, color: '#10b981' },
          { range: '55+', percentage: 5, color: '#f59e0b' }
        ];
      } else if (targetAge.includes('35-55')) {
        return [
          { range: '35-44', percentage: 40, color: '#8b5cf6' },
          { range: '45-54', percentage: 35, color: '#3b82f6' },
          { range: '55-64', percentage: 20, color: '#10b981' },
          { range: '65+', percentage: 5, color: '#f59e0b' }
        ];
      } else if (targetAge.includes('45-65')) {
        return [
          { range: '45-54', percentage: 35, color: '#8b5cf6' },
          { range: '55-64', percentage: 40, color: '#3b82f6' },
          { range: '65-74', percentage: 20, color: '#10b981' },
          { range: '75+', percentage: 5, color: '#f59e0b' }
        ];
      } else {
        // Default distribution
        return [
          { range: '25-34', percentage: 35, color: '#8b5cf6' },
          { range: '35-44', percentage: 35, color: '#3b82f6' },
          { range: '45-54', percentage: 20, color: '#10b981' },
          { range: '55+', percentage: 10, color: '#f59e0b' }
        ];
      }
    };
    
    return {
      ageGroups: getAgeDistribution(),
      ageGroupsExplanation: `Target demographic: ${targetAge} with income range ${incomeRange}. Market size estimated at ${marketSize} with ${competition} competition level. Key interests include ${interests.join(', ') || 'technology and innovation'}.`,
      
      locations: isEnterprise ? [
        { name: 'North America', percentage: 45, type: 'Primary' },
        { name: 'Europe', percentage: 30, type: 'Secondary' },
        { name: 'Asia Pacific', percentage: 20, type: 'Growth' },
        { name: 'Other', percentage: 5, type: 'Emerging' }
      ] : [
        { name: 'Urban Centers', percentage: 60, type: 'Primary' },
        { name: 'Suburbs', percentage: 25, type: 'Secondary' },
        { name: 'Rural Areas', percentage: 10, type: 'Growth' },
        { name: 'International', percentage: 5, type: 'Future' }
      ],
      locationsExplanation: `Geographic concentration in ${isEnterprise ? 'North America (45%) and Europe (30%) reflects enterprise spending patterns' : 'Urban Centers (60%) indicates tech-savvy early adopters'}. Market entry strategy should prioritize ${isEnterprise ? 'established business hubs' : 'metropolitan areas'} with organic growth approach. Infrastructure and cultural factors favor initial focus on primary markets.`,
      
      occupations: isEnterprise ? [
        { title: 'C-Suite Executives', percentage: 15, income: '$200k+' },
        { title: 'Directors/VPs', percentage: 35, income: '$150k-200k' },
        { title: 'Managers', percentage: 40, income: '$100k-150k' },
        { title: 'Analysts', percentage: 10, income: '$75k-100k' }
      ] : isMass ? [
        { title: 'Professionals', percentage: 30, income: '$50k-100k' },
        { title: 'Students', percentage: 25, income: '<$30k' },
        { title: 'Freelancers', percentage: 20, income: '$30k-75k' },
        { title: 'Small Business', percentage: 25, income: '$40k-80k' }
      ] : [
        { title: 'Tech Workers', percentage: 40, income: '$80k-150k' },
        { title: 'Consultants', percentage: 25, income: '$70k-120k' },
        { title: 'Entrepreneurs', percentage: 20, income: 'Variable' },
        { title: 'Creatives', percentage: 15, income: '$40k-80k' }
      ],
      occupationsExplanation: `Occupation analysis reveals ${isEnterprise ? 'budget holders concentrated in Director/VP level (35%) with significant C-Suite involvement (15%)' : isMass ? 'diverse professional backgrounds with varied income levels' : 'tech-forward professionals (40%) leading adoption'}. Income distribution supports value-based pricing models. Decision-making processes align with MVP deployment schedules.`,
      
      behaviors: isEnterprise ? [
        { behavior: 'Research-driven purchasing', frequency: 'Always', impact: 'High' },
        { behavior: 'Committee decisions', frequency: 'Common', impact: 'High' },
        { behavior: 'ROI focus', frequency: 'Critical', impact: 'High' },
        { behavior: 'Long sales cycles', frequency: '3-6 months', impact: 'Medium' }
      ] : [
        { behavior: 'Social proof seeking', frequency: 'Often', impact: 'High' },
        { behavior: 'Mobile-first usage', frequency: 'Daily', impact: 'High' },
        { behavior: 'Price comparison', frequency: 'Always', impact: 'Medium' },
        { behavior: 'Impulse purchasing', frequency: 'Sometimes', impact: 'Low' }
      ],
      behaviorsExplanation: `Behavioral patterns indicate ${isEnterprise ? 'complex B2B buying processes with multiple stakeholders and ROI requirements' : 'consumer-driven decisions influenced by social proof and convenience'}. Key success factors include ${isEnterprise ? 'demonstrable business value and stakeholder alignment' : 'user experience excellence and community building'}. Marketing approach should emphasize ${market === 'enterprise' ? 'case studies and white papers' : 'testimonials and user-generated content'}.`
    };
  };

  const demographics = generateDemographics();

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      {/* Age Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Age Distribution
          </CardTitle>
          <CardDescription>Target demographic age breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographics.ageGroups}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="percentage"
                  label={({ range, percentage }) => `${range}: ${percentage}%`}
                >
                  {demographics.ageGroups.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {demographics.ageGroups.map((group, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: group.color }} />
                <span className="text-sm">{group.range}: {group.percentage}%</span>
              </div>
            ))}
          </div>
          <Collapsible open={expandedSections.age} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, age: open }))}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-4 bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow group"
              >
                <Crown className="w-4 h-4 mr-2 text-yellow-300" />
                <span className="font-semibold">AI Analysis</span>
                <Sparkles className="w-4 h-4 ml-1 text-yellow-300" />
                {expandedSections.age ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 bg-gradient-subtle p-4 rounded-lg border border-primary/20 backdrop-blur-sm">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {demographics.ageGroupsExplanation}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Geographic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            Geographic Distribution
          </CardTitle>
          <CardDescription>Primary market locations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            {demographics.locations.map((location, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{location.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={location.type === 'Primary' ? 'default' : 'secondary'}>
                    {location.type}
                  </Badge>
                  <span className="text-sm font-medium">{location.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
          <Collapsible open={expandedSections.location} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, location: open }))}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-4 bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow group"
              >
                <Crown className="w-4 h-4 mr-2 text-yellow-300" />
                <span className="font-semibold">AI Insights</span>
                <Sparkles className="w-4 h-4 ml-1 text-yellow-300" />
                {expandedSections.location ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 bg-gradient-subtle p-4 rounded-lg border border-primary/20 backdrop-blur-sm">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {demographics.locationsExplanation}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Occupation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-success" />
            Occupation Analysis
          </CardTitle>
          <CardDescription>Professional demographics and income levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            {demographics.occupations.map((occupation, idx) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{occupation.title}</span>
                  <Badge variant="outline">{occupation.income}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={occupation.percentage} className="flex-1" />
                  <span className="text-sm font-medium w-12 text-right">{occupation.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
          <Collapsible open={expandedSections.occupation} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, occupation: open }))}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-4 bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow group"
              >
                <Crown className="w-4 h-4 mr-2 text-yellow-300" />
                <span className="font-semibold">AI Research</span>
                <Sparkles className="w-4 h-4 ml-1 text-yellow-300" />
                {expandedSections.occupation ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 bg-gradient-subtle p-4 rounded-lg border border-primary/20 backdrop-blur-sm">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {demographics.occupationsExplanation}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Behavioral Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-warning" />
            Behavioral Patterns
          </CardTitle>
          <CardDescription>Key user behaviors and decision factors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            {demographics.behaviors.map((behavior, idx) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{behavior.behavior}</span>
                  <Badge 
                    variant={behavior.impact === 'High' ? 'destructive' : behavior.impact === 'Medium' ? 'default' : 'secondary'}
                  >
                    {behavior.impact} Impact
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Frequency: {behavior.frequency}</p>
              </div>
            ))}
          </div>
          <Collapsible open={expandedSections.behaviors} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, behaviors: open }))}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-4 bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow group"
              >
                <Crown className="w-4 h-4 mr-2 text-yellow-300" />
                <span className="font-semibold">AI Deep Dive</span>
                <Sparkles className="w-4 h-4 ml-1 text-yellow-300" />
                {expandedSections.behaviors ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 bg-gradient-subtle p-4 rounded-lg border border-primary/20 backdrop-blur-sm">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {demographics.behaviorsExplanation}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
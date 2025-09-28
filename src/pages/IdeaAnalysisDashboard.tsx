/**
 * Idea Analysis Dashboard
 * Real-time data dashboard with interactive cards and cost-optimized fetching
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SimpleSessionContext';
import { useToast } from '@/hooks/use-toast';
import { InteractiveDataCard } from '@/components/dashboard/InteractiveDataCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  ChevronLeft, 
  Filter, 
  Download,
  Globe,
  Clock,
  Building2,
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Youtube,
  Twitter,
  ShoppingCart,
  DollarSign,
  Target,
  Calendar,
  Rocket,
  Search,
  Newspaper
} from 'lucide-react';
import { CardType } from '@/lib/dashboard-data-fetcher';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CardConfig {
  type: CardType;
  title: string;
  description: string;
  icon: React.ElementType;
  chartType: 'line' | 'bar' | 'pie' | 'metric';
  category: 'research' | 'social' | 'market' | 'strategy';
}

const CARD_CONFIGS: CardConfig[] = [
  {
    type: 'web-search',
    title: 'Web Search Insights',
    description: 'Real-time search trends and demand signals',
    icon: Search,
    chartType: 'line',
    category: 'research',
  },
  {
    type: 'news-analysis',
    title: 'News Analysis',
    description: 'Media coverage and news momentum',
    icon: Newspaper,
    chartType: 'bar',
    category: 'research',
  },
  {
    type: 'reddit-sentiment',
    title: 'Reddit Sentiment',
    description: 'Community discussions and sentiment analysis',
    icon: MessageSquare,
    chartType: 'pie',
    category: 'social',
  },
  {
    type: 'youtube-analytics',
    title: 'YouTube Analytics',
    description: 'Video content trends and creator activity',
    icon: Youtube,
    chartType: 'bar',
    category: 'social',
  },
  {
    type: 'twitter-buzz',
    title: 'X/Twitter Buzz',
    description: 'Social media mentions and viral trends',
    icon: Twitter,
    chartType: 'line',
    category: 'social',
  },
  {
    type: 'amazon-reviews',
    title: 'Amazon Reviews',
    description: 'Product reviews and customer feedback',
    icon: ShoppingCart,
    chartType: 'metric',
    category: 'market',
  },
  {
    type: 'competitor-analysis',
    title: 'Competitor Analysis',
    description: 'Competitive landscape and positioning',
    icon: Users,
    chartType: 'metric',
    category: 'market',
  },
  {
    type: 'market-size',
    title: 'Market Size',
    description: 'TAM, SAM, and SOM calculations',
    icon: BarChart3,
    chartType: 'pie',
    category: 'market',
  },
  {
    type: 'pricing-strategy',
    title: 'Pricing Strategy',
    description: 'Price points and willingness to pay',
    icon: DollarSign,
    chartType: 'bar',
    category: 'strategy',
  },
  {
    type: 'target-audience',
    title: 'Target Audience',
    description: 'User personas and demographics',
    icon: Target,
    chartType: 'metric',
    category: 'strategy',
  },
  {
    type: 'growth-projections',
    title: 'Growth Projections',
    description: 'Scenario-based growth forecasts',
    icon: TrendingUp,
    chartType: 'line',
    category: 'strategy',
  },
  {
    type: 'user-engagement',
    title: 'User Engagement',
    description: 'Engagement metrics across channels',
    icon: Users,
    chartType: 'bar',
    category: 'strategy',
  },
  {
    type: 'launch-timeline',
    title: 'Launch Timeline',
    description: '30/60/90 day action plan',
    icon: Calendar,
    chartType: 'metric',
    category: 'strategy',
  },
];

export function IdeaAnalysisDashboard() {
  const navigate = useNavigate();
  const { currentSession } = useSession();
  const currentIdea = currentSession?.data?.currentIdea;
  const { toast } = useToast();
  
  const [filters, setFilters] = useState({
    idea_keywords: currentIdea || '',
    industry: 'general',
    geography: 'global',
    time_window: 'last_90_days',
  });
  
  const [activeCategory, setActiveCategory] = useState<'all' | 'research' | 'social' | 'market' | 'strategy'>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [compareIdeas, setCompareIdeas] = useState<string[]>([]);

  // Filter cards by category
  const visibleCards = activeCategory === 'all' 
    ? CARD_CONFIGS 
    : CARD_CONFIGS.filter(c => c.category === activeCategory);

  // Export entire dashboard as PDF
  const exportDashboardPDF = async () => {
    const dashboard = document.getElementById('idea-dashboard');
    if (!dashboard) return;
    
    toast({
      title: 'Generating PDF',
      description: 'This may take a few moments...',
    });
    
    const canvas = await html2canvas(dashboard);
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`idea-analysis-${new Date().toISOString()}.pdf`);
    
    toast({
      title: 'PDF Generated',
      description: 'Your dashboard has been exported successfully.',
    });
  };

  useEffect(() => {
    if (currentIdea) {
      setFilters(prev => ({ ...prev, idea_keywords: currentIdea }));
    }
  }, [currentIdea]);

  if (!currentIdea) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center space-y-4">
          <Brain className="h-16 w-16 mx-auto text-muted-foreground animate-pulse" />
          <h2 className="text-2xl font-semibold">No Active Idea</h2>
          <p className="text-muted-foreground">Start by entering an idea to analyze</p>
          <Button onClick={() => navigate('/')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Go to Idea Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div id="idea-dashboard" className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Idea Analysis Dashboard</h1>
                <p className="text-sm text-muted-foreground">Real-time market intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1">
                <Clock className="mr-1 h-3 w-3" />
                Live Data
              </Badge>
              <Button variant="outline" size="sm" onClick={exportDashboardPDF}>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Global Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Idea Keywords</label>
              <Input
                value={filters.idea_keywords}
                onChange={(e) => setFilters(prev => ({ ...prev, idea_keywords: e.target.value }))}
                placeholder="Enter keywords..."
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Industry</label>
              <Select
                value={filters.industry}
                onValueChange={(value) => setFilters(prev => ({ ...prev, industry: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Geography</label>
              <Select
                value={filters.geography}
                onValueChange={(value) => setFilters(prev => ({ ...prev, geography: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="eu">Europe</SelectItem>
                  <SelectItem value="asia">Asia</SelectItem>
                  <SelectItem value="latam">Latin America</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Window</label>
              <Select
                value={filters.time_window}
                onValueChange={(value) => setFilters(prev => ({ ...prev, time_window: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="last_12_months">Last 12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="container mx-auto px-4 pb-6">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Cards</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>

          <TabsContent value={activeCategory} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visibleCards.map((config) => {
                return (
                  <InteractiveDataCard
                    key={config.type}
                    cardType={config.type}
                    title={config.title}
                    description={config.description}
                    idea={filters.idea_keywords}
                    industry={filters.industry}
                    geo={filters.geography}
                    time_window={filters.time_window}
                    chartType={config.chartType}
                    className="h-full"
                  />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 border-t">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>💡 Tip: Click any card to see detailed insights</span>
            <span>•</span>
            <span>🔄 Enable auto-refresh for real-time updates</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Rocket className="mr-1 h-3 w-3" />
              Cost Optimized
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
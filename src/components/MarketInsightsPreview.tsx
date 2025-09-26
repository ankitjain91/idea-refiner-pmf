import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  Lock,
  Sparkles,
  ChevronRight,
  BarChart3,
  Globe,
  Zap
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MarketInsightsPreviewProps {
  idea?: string;
  isLocked?: boolean;
  pmfScore?: number;
}

const MarketInsightsPreview: React.FC<MarketInsightsPreviewProps> = ({
  idea = '',
  isLocked = true,
  pmfScore = 75
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const sampleInsights = {
    marketSize: {
      value: "$24.5B",
      growth: "+18% YoY",
      confidence: 85
    },
    competitors: {
      direct: 12,
      indirect: 34,
      marketGap: "Underserved SMB segment"
    },
    trends: [
      { name: "AI Integration", score: 92, rising: true },
      { name: "Mobile-first", score: 88, rising: true },
      { name: "Subscription model", score: 76, rising: false },
      { name: "B2B focus", score: 64, rising: true }
    ],
    channels: [
      { name: "LinkedIn", effectiveness: 89, cost: "$$" },
      { name: "Reddit", effectiveness: 78, cost: "$" },
      { name: "Google Ads", effectiveness: 71, cost: "$$$" },
      { name: "Content Marketing", effectiveness: 82, cost: "$" }
    ],
    dataSources: [
      "Google Trends API",
      "Reddit Sentiment Analysis",
      "LinkedIn Market Research",
      "TikTok Trend Analysis",
      "YouTube Search Volume"
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header with Trust Indicators */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Market Insights Preview
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time data from 5+ trusted sources
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          Live Data
        </Badge>
      </div>

      {/* Market Size Card */}
      <Card className={cn(
        "relative overflow-hidden",
        isLocked && "after:absolute after:inset-0 after:bg-gradient-to-t after:from-background/95 after:via-background/50 after:to-transparent"
      )}>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Market Opportunity
            </span>
            {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{sampleInsights.marketSize.value}</p>
              <p className="text-sm text-muted-foreground">Total Market Size</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{sampleInsights.marketSize.growth}</p>
              <p className="text-sm text-muted-foreground">Annual Growth</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Data Confidence</span>
              <span>{sampleInsights.marketSize.confidence}%</span>
            </div>
            <Progress value={sampleInsights.marketSize.confidence} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Trending Topics */}
      <Card className={cn(
        "relative",
        isLocked && "opacity-75"
      )}>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Market Trends
            </span>
            {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sampleInsights.trends.slice(0, isLocked ? 2 : 4).map((trend, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={trend.rising ? "default" : "secondary"} className="h-5">
                    {trend.rising ? "↑" : "→"}
                  </Badge>
                  <span className="text-sm">{trend.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={trend.score} className="h-2 w-20" />
                  <span className="text-xs text-muted-foreground">{trend.score}%</span>
                </div>
              </div>
            ))}
            {isLocked && (
              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground">+{sampleInsights.trends.length - 2} more trends</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Data Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {sampleInsights.dataSources.map((source, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {source}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            All data is validated and cross-referenced for accuracy
          </p>
        </CardContent>
      </Card>

      {/* Unlock CTA */}
      {isLocked && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Sparkles className="h-8 w-8 text-primary mx-auto" />
              <div>
                <h4 className="font-semibold">Unlock Full Market Analysis</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Get detailed insights, competitor analysis, and actionable recommendations
                </p>
              </div>
              <Button 
                onClick={() => navigate('/pricing', { state: { from: location } })}
                className="w-full sm:w-auto"
              >
                View Premium Plans
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketInsightsPreview;
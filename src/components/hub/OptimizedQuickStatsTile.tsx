import { useState } from 'react';
import { BaseTile } from './BaseTile';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, Brain, Globe, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OptimizedQuickStatsTileProps {
  title: string;
  icon: any;
  tileType: 'pmf_score' | 'market_size' | 'competition' | 'sentiment';
  data: any;  // Data from batched fetch
  isLoading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

export function OptimizedQuickStatsTile({
  title,
  icon,
  tileType,
  data,
  isLoading = false,
  error,
  onRefresh
}: OptimizedQuickStatsTileProps) {
  const [showDialog, setShowDialog] = useState(false);

  const renderTileContent = () => {
    if (!data) return null;

    switch (tileType) {
      case 'pmf_score':
        const score = data.score || 0;
        const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600';
        return (
          <div className="space-y-4">
            <div 
              className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowDialog(true)}
            >
              <div>
                <p className={cn("text-3xl font-bold", scoreColor)}>
                  {score}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.tier || (score >= 70 ? 'Strong PMF' : score >= 40 ? 'Moderate PMF' : 'Needs Work')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={score >= 70 ? 'default' : score >= 40 ? 'secondary' : 'destructive'}>
                  {score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low'}
                </Badge>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  <Brain className="h-3 w-3 mr-1" />
                  Details
                </Button>
              </div>
            </div>
            {data.factors && (
              <div className="space-y-2">
                {Object.entries(data.factors).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">
                      {typeof value === 'number' ? `${value}%` : value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'market_size':
        const tam = data.tam || 0;
        const sam = data.sam || 0;
        const som = data.som || 0;
        const formatMarketValue = (value: number) => {
          if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
          if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
          if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
          return `$${value}`;
        };

        return (
          <div className="space-y-4">
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowDialog(true)}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">TAM</p>
                  <p className="text-2xl font-bold">{formatMarketValue(tam)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">SAM</p>
                    <p className="text-sm font-semibold">{formatMarketValue(sam)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">SOM</p>
                    <p className="text-sm font-semibold">{formatMarketValue(som)}</p>
                  </div>
                </div>
                {data.cagr && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Growth</span>
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {data.cagr}%
                    </Badge>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs mt-3 w-full">
                <Globe className="h-3 w-3 mr-1" />
                View Analysis
              </Button>
            </div>
          </div>
        );

      case 'competition':
        const competitionLevel = data.level || 'Unknown';
        const competitors = data.competitors || [];
        const levelColor = competitionLevel === 'Low' ? 'text-green-600' : 
                          competitionLevel === 'Medium' ? 'text-yellow-600' : 'text-red-600';
        
        return (
          <div className="space-y-4">
            <div>
              <p className={cn("text-2xl font-bold", levelColor)}>
                {competitionLevel}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {competitors.length} competitors identified
              </p>
            </div>
            {data.insights && data.insights.length > 0 && (
              <div className="space-y-2">
                {data.insights.slice(0, 2).map((insight: string, idx: number) => (
                  <p key={idx} className="text-xs text-muted-foreground">
                    • {insight}
                  </p>
                ))}
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs w-full"
              onClick={() => setShowDialog(true)}
            >
              View Details
            </Button>
          </div>
        );

      case 'sentiment':
        const sentimentScore = data.overall || data.sentiment || 0;
        const sentimentColor = sentimentScore >= 70 ? 'text-green-600' : 
                              sentimentScore >= 40 ? 'text-yellow-600' : 'text-red-600';
        
        return (
          <div className="space-y-4">
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowDialog(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-2xl font-bold", sentimentColor)}>
                    {sentimentScore}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sentimentScore >= 70 ? 'Positive' : sentimentScore >= 40 ? 'Neutral' : 'Negative'}
                  </p>
                </div>
                <Heart className={cn("h-8 w-8", sentimentColor)} />
              </div>
              {data.distribution && (
                <div className="space-y-1 mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Positive</span>
                    <span>{data.distribution.positive || 0}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-yellow-600">Neutral</span>
                    <span>{data.distribution.neutral || 0}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-red-600">Negative</span>
                    <span>{data.distribution.negative || 0}%</span>
                  </div>
                </div>
              )}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs mt-3 w-full">
                <Heart className="h-3 w-3 mr-1" />
                View Analysis
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderDialog = () => {
    if (!showDialog || !data) return null;

    switch (tileType) {
      case 'pmf_score':
        return (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>SmoothBrains Score Analysis</DialogTitle>
                <DialogDescription>
                  Detailed breakdown of your Product-Market Fit score
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold">{data.score}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tier</p>
                    <p className="text-lg font-semibold">{data.tier}</p>
                  </div>
                </div>
                {data.analysis && (
                  <div className="space-y-3">
                    {data.analysis.strengths && (
                      <div>
                        <p className="font-semibold mb-2">Strengths</p>
                        <ul className="list-disc list-inside space-y-1">
                          {data.analysis.strengths.map((s: string, i: number) => (
                            <li key={i} className="text-sm">{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data.analysis.weaknesses && (
                      <div>
                        <p className="font-semibold mb-2">Weaknesses</p>
                        <ul className="list-disc list-inside space-y-1">
                          {data.analysis.weaknesses.map((w: string, i: number) => (
                            <li key={i} className="text-sm">{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data.analysis.verdict && (
                      <div>
                        <p className="font-semibold mb-2">Verdict</p>
                        <p className="text-sm">{data.analysis.verdict}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );

      case 'market_size':
        return (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Market Size Analysis</DialogTitle>
                <DialogDescription>
                  Total Addressable Market, Serviceable Market, and Obtainable Market
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 p-4">
                {data.calculationDetails && (
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold">TAM - Total Addressable Market</p>
                      <p className="text-2xl font-bold">${(data.tam / 1000000).toFixed(1)}M</p>
                      <p className="text-sm text-muted-foreground">{data.calculationDetails.calculations?.tam?.explanation}</p>
                    </div>
                    <div>
                      <p className="font-semibold">SAM - Serviceable Addressable Market</p>
                      <p className="text-xl font-bold">${(data.sam / 1000000).toFixed(1)}M</p>
                      <p className="text-sm text-muted-foreground">{data.calculationDetails.calculations?.sam?.explanation}</p>
                    </div>
                    <div>
                      <p className="font-semibold">SOM - Serviceable Obtainable Market</p>
                      <p className="text-xl font-bold">${(data.som / 1000000).toFixed(1)}M</p>
                      <p className="text-sm text-muted-foreground">{data.calculationDetails.calculations?.som?.explanation}</p>
                    </div>
                  </div>
                )}
                {data.segments && (
                  <div>
                    <p className="font-semibold mb-2">Market Segments</p>
                    {data.segments.map((segment: any, i: number) => (
                      <div key={i} className="border rounded p-3 mb-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{segment.name}</span>
                          <Badge>{segment.priority}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {segment.share}% share • {segment.growth}% growth
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );

      case 'competition':
        return (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Competition Analysis</DialogTitle>
                <DialogDescription>
                  Competitive landscape and market positioning
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Competition Level</p>
                  <p className="text-2xl font-bold">{data.level}</p>
                </div>
                {data.competitors && data.competitors.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">Key Competitors</p>
                    {data.competitors.map((comp: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 border-b">
                        <span>{comp.name}</span>
                        <Badge variant="outline">{comp.type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {data.insights && (
                  <div>
                    <p className="font-semibold mb-2">Strategic Insights</p>
                    <ul className="list-disc list-inside space-y-1">
                      {data.insights.map((insight: string, i: number) => (
                        <li key={i} className="text-sm">{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );

      case 'sentiment':
        return (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>User Sentiment Analysis</DialogTitle>
                <DialogDescription>
                  Market sentiment and user feedback analysis
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Positive</p>
                    <p className="text-xl font-bold text-green-600">
                      {data.distribution?.positive || 0}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Neutral</p>
                    <p className="text-xl font-bold text-yellow-600">
                      {data.distribution?.neutral || 0}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Negative</p>
                    <p className="text-xl font-bold text-red-600">
                      {data.distribution?.negative || 0}%
                    </p>
                  </div>
                </div>
                {data.positive_themes && data.positive_themes.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">Positive Themes</p>
                    <div className="flex flex-wrap gap-2">
                      {data.positive_themes.map((theme: string, i: number) => (
                        <Badge key={i} variant="secondary">{theme}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {data.concern_themes && data.concern_themes.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">Areas of Concern</p>
                    <div className="flex flex-wrap gap-2">
                      {data.concern_themes.map((theme: string, i: number) => (
                        <Badge key={i} variant="outline">{theme}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <BaseTile
        title={title}
        icon={icon}
        isLoading={isLoading}
        error={error}
        data={data}
        className="h-full"
      >
        {renderTileContent()}
      </BaseTile>
      {renderDialog()}
    </>
  );
}
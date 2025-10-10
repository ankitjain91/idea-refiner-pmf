import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Target, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLedger } from '@/hooks/useLedger';
import { useEffect, useState } from 'react';

interface PMFScoreCardProps {
  currentScore: any;
  loading: boolean;
  onRecalculate: () => void;
  ideaId?: string;
}

export function PMFScoreCard({ currentScore, loading, onRecalculate, ideaId }: PMFScoreCardProps) {
  const { getOwnershipProof } = useLedger();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const checkOwnership = async () => {
      if (!ideaId) return;
      const proof = await getOwnershipProof(ideaId);
      setIsOwner(!!proof);
    };
    checkOwnership();
  }, [ideaId, getOwnershipProof]);

  if (loading && !currentScore) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading PMF score...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentScore) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Target className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">No PMF Score Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Calculate your Product-Market Fit score to get AI-powered insights and actionable recommendations.
              </p>
            </div>
            <Button onClick={onRecalculate} size="lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              Calculate PMF Score
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = currentScore.pmf_score || 0;
  const getScoreVariant = (s: number) => {
    if (s >= 70) return 'default';
    if (s >= 40) return 'secondary';
    return 'destructive';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 70) return 'Strong PMF';
    if (s >= 40) return 'Moderate PMF';
    return 'Needs Work';
  };

  const breakdown = currentScore.score_breakdown || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>Product-Market Fit Score</CardTitle>
            <CardDescription>
              AI-powered analysis • {currentScore.ai_confidence ? `${(currentScore.ai_confidence * 100).toFixed(0)}% confidence` : 'Analyzed'}
              {currentScore.created_at && (
                <> • Updated {formatDistanceToNow(new Date(currentScore.created_at), { addSuffix: true })}</>
              )}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRecalculate}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="flex items-center gap-6">
          <div className="relative h-32 w-32">
            <svg className="transform -rotate-90 h-32 w-32">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - score / 100)}`}
                className="text-primary transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getScoreVariant(score)} className="text-sm px-3 py-1">
                {getScoreLabel(score)}
              </Badge>
              {isOwner && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified Owner
                </Badge>
              )}
              {currentScore.ai_confidence && (
                <span className="text-xs text-muted-foreground">
                  AI Confidence: {(currentScore.ai_confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {score >= 70 
                ? '🎉 Excellent! Your idea shows strong product-market fit. Focus on execution and growth.' 
                : score >= 40
                ? '💪 Good foundation. Continue iterating based on the recommended actions below.'
                : '🔧 Your idea needs refinement. Review the key insights and focus on addressing the main gaps.'}
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        {Object.keys(breakdown).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Score Breakdown</h4>
            <div className="space-y-2">
              {Object.entries(breakdown).map(([key, value]: [string, any]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">{value}/100</span>
                  </div>
                  <Progress value={value} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Sources */}
        {currentScore.data_sources && currentScore.data_sources.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Data sources: {currentScore.data_sources.join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

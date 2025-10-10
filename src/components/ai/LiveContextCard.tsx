import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  TrendingUp, 
  Users, 
  Heart, 
  BarChart3,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { useLiveContext, LiveContext } from '@/hooks/useLiveContext'
import { cn } from '@/lib/utils'

interface LiveContextCardProps {
  ideaId: string
  className?: string
}

export function LiveContextCard({ ideaId, className }: LiveContextCardProps) {
  const { 
    contexts, 
    loading, 
    error, 
    refreshContext, 
    getContextByType,
    isContextExpired 
  } = useLiveContext(ideaId)

  const handleRefresh = () => {
    refreshContext(ideaId, true)
  }

  const getContextIcon = (type: LiveContext['context_type']) => {
    switch (type) {
      case 'market':
        return <BarChart3 className="h-4 w-4" />
      case 'competitor':
        return <Users className="h-4 w-4" />
      case 'sentiment':
        return <Heart className="h-4 w-4" />
      case 'trends':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <BarChart3 className="h-4 w-4" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'text-green-600 bg-green-50'
      case 'negative':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  const renderMarketContext = (context: LiveContext) => {
    const data = context.data?.analysis || context.data
    return (
      <div className="space-y-3">
        <div>
          <h5 className="text-sm font-medium mb-2">Market Size</h5>
          <p className="text-sm text-muted-foreground">
            {data?.size_estimate || 'Analyzing...'}
          </p>
        </div>
        
        <div>
          <h5 className="text-sm font-medium mb-2">Growth Rate</h5>
          <p className="text-sm text-muted-foreground">
            {data?.growth_rate || 'Analyzing...'}
          </p>
        </div>

        {data?.opportunities && data.opportunities.length > 0 && (
          <div>
            <h5 className="text-sm font-medium mb-2">Key Opportunities</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              {data.opportunities.slice(0, 3).map((opp: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                  {opp}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const renderCompetitorContext = (context: LiveContext) => {
    const data = context.data?.analysis || context.data
    return (
      <div className="space-y-3">
        <div>
          <h5 className="text-sm font-medium mb-2">Market Position</h5>
          <p className="text-sm text-muted-foreground">
            {data?.market_positioning || 'Analyzing...'}
          </p>
        </div>

        {data?.main_competitors && data.main_competitors.length > 0 && (
          <div>
            <h5 className="text-sm font-medium mb-2">Main Competitors</h5>
            <div className="flex flex-wrap gap-1">
              {data.main_competitors.slice(0, 5).map((competitor: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {competitor}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <h5 className="text-sm font-medium mb-2">Competitive Advantage</h5>
          <p className="text-sm text-muted-foreground">
            {data?.competitive_advantage || 'Analyzing...'}
          </p>
        </div>
      </div>
    )
  }

  const renderSentimentContext = (context: LiveContext) => {
    const data = context.data?.analysis || context.data
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-medium">Overall Sentiment</h5>
          <Badge className={getSentimentColor(data?.overall_sentiment || 'neutral')}>
            {data?.overall_sentiment || 'neutral'}
          </Badge>
        </div>

        {data?.key_insights && data.key_insights.length > 0 && (
          <div>
            <h5 className="text-sm font-medium mb-2">Key Insights</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              {data.key_insights.slice(0, 3).map((insight: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const renderTrendsContext = (context: LiveContext) => {
    const data = context.data
    return (
      <div className="space-y-3">
        {data?.trending_topics && data.trending_topics.length > 0 && (
          <div>
            <h5 className="text-sm font-medium mb-2">Trending Topics</h5>
            <div className="flex flex-wrap gap-1">
              {data.trending_topics.slice(0, 5).map((topic: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data?.recommendations && data.recommendations.length > 0 && (
          <div>
            <h5 className="text-sm font-medium mb-2">Recommendations</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              {data.recommendations.slice(0, 3).map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <TrendingUp className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data?.risk_factors && data.risk_factors.length > 0 && (
          <div>
            <h5 className="text-sm font-medium mb-2">Risk Factors</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              {data.risk_factors.slice(0, 2).map((risk: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 mt-0.5 text-orange-500 flex-shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const renderContextContent = (context: LiveContext) => {
    switch (context.context_type) {
      case 'market':
        return renderMarketContext(context)
      case 'competitor':
        return renderCompetitorContext(context)
      case 'sentiment':
        return renderSentimentContext(context)
      case 'trends':
        return renderTrendsContext(context)
      default:
        return <p className="text-sm text-muted-foreground">No data available</p>
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Live Market Context
          </CardTitle>
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && contexts.length === 0 && (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {contexts.length > 0 && (
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {contexts.map((context) => (
                <div key={context.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getContextIcon(context.context_type)}
                      <h4 className="font-medium text-sm capitalize">
                        {context.context_type} Analysis
                      </h4>
                      {isContextExpired(context) && (
                        <Badge variant="destructive" className="text-xs">
                          Expired
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(context.last_updated)}
                    </div>
                  </div>

                  {renderContextContent(context)}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className={cn('font-medium', getConfidenceColor(context.confidence_score))}>
                        {Math.round(context.confidence_score * 100)}%
                      </span>
                    </div>
                    
                    {context.sources && context.sources.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => window.open(context.sources[0], '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Source
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {contexts.length === 0 && !loading && !error && (
          <div className="text-center py-8">
            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No live context data available. Click refresh to fetch latest market insights.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
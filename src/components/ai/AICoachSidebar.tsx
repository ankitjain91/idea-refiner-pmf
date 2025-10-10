import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Lightbulb,
  Zap
} from 'lucide-react'
import { usePMF, PMFScore, Action } from '@/hooks/usePMF'
import { cn } from '@/lib/utils'

interface AICoachSidebarProps {
  ideaId: string
  className?: string
}

export function AICoachSidebar({ ideaId, className }: AICoachSidebarProps) {
  const { 
    currentScore, 
    actions, 
    loading, 
    error, 
    computePMF, 
    updateActionStatus 
  } = usePMF(ideaId)

  const handleRefreshPMF = () => {
    computePMF(ideaId, true)
  }

  const handleActionComplete = (actionId: string) => {
    updateActionStatus(actionId, 'completed')
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreDescription = (score: number) => {
    if (score >= 80) return 'Strong PMF'
    if (score >= 60) return 'Moderate PMF'
    if (score >= 40) return 'Developing PMF'
    return 'Early Stage'
  }

  const getPriorityIcon = (priority: number) => {
    if (priority === 1) return <AlertCircle className="h-4 w-4 text-red-500" />
    if (priority === 2) return <Clock className="h-4 w-4 text-yellow-500" />
    return <Target className="h-4 w-4 text-blue-500" />
  }

  const getEffortBadge = (effort: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    }
    return colors[effort as keyof typeof colors] || colors.medium
  }

  return (
    <div className={cn('w-80 space-y-4', className)}>
      {/* PMF Score Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI PMF Coach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center p-4">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {currentScore && (
            <>
              <div className="text-center space-y-2">
                <div className={cn('text-3xl font-bold', getScoreColor(currentScore.pmf_score))}>
                  {currentScore.pmf_score}/100
                </div>
                <div className="text-sm text-muted-foreground">
                  {getScoreDescription(currentScore.pmf_score)}
                </div>
                <Progress 
                  value={currentScore.pmf_score} 
                  className="h-2"
                />
              </div>

              <Separator />

              {/* Score Breakdown */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Score Breakdown
                </h4>
                {Object.entries(currentScore.score_breakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="capitalize">
                      {key.replace('_', ' ')}
                    </span>
                    <span className={cn('font-medium', getScoreColor(value))}>
                      {value}/100
                    </span>
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleRefreshPMF}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                Refresh Analysis
              </Button>
            </>
          )}

          {!currentScore && !loading && !error && (
            <div className="text-center space-y-3">
              <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Get AI-powered PMF analysis for your idea
              </p>
              <Button 
                onClick={() => computePMF(ideaId)}
                disabled={loading}
                className="w-full"
              >
                <Zap className="h-4 w-4 mr-2" />
                Analyze PMF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Steps Card */}
      {actions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {actions
                  .filter(action => action.status === 'pending')
                  .slice(0, 5)
                  .map((action) => (
                    <div
                      key={action.id}
                      className="p-3 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(action.priority)}
                          <h5 className="font-medium text-sm leading-tight">
                            {action.title}
                          </h5>
                        </div>
                        <Badge 
                          variant="outline"
                          className={getEffortBadge(action.estimated_effort)}
                        >
                          {action.estimated_effort}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {action.category}
                        </Badge>
                        
                        <Button
                          onClick={() => handleActionComplete(action.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Done
                        </Button>
                      </div>
                      
                      {action.due_date && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(action.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* AI Confidence Indicator */}
      {currentScore && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI Confidence</span>
              <span className="font-medium">
                {Math.round(currentScore.ai_confidence * 100)}%
              </span>
            </div>
            <Progress 
              value={currentScore.ai_confidence * 100} 
              className="h-1 mt-2"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
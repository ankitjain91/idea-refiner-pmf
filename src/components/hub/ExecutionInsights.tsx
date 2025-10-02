import { useState, useEffect } from "react";
import { extractEdgeFunctionData } from "@/utils/edgeFunctionUtils";
import { optimizedQueue } from '@/lib/optimized-request-queue';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, AlertTriangle, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { AlertCircle } from "lucide-react";

interface ExecutionInsightsProps {
  idea: string;
}

export function ExecutionInsights({ idea }: ExecutionInsightsProps) {
  const [loading, setLoading] = useState(true);
  const [execution, setExecution] = useState<any>(null);

  useEffect(() => {
    if (idea) {
      fetchExecutionData();
    }
  }, [idea]);

  const fetchExecutionData = async () => {
    setLoading(true);
    try {
      const data = await optimizedQueue.invokeFunction('execution-insights', { idea });
      const error = null;

      // Extract data using the utility function
      const extractedData = extractEdgeFunctionData({ data, error }, 'execution');
      if (extractedData) {
        setExecution(extractedData);
      }
    } catch (error) {
      console.error('Error fetching execution data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card/50 backdrop-blur">
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case 'high': return 'bg-red-500/20 text-red-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500';
      case 'low': return 'bg-green-500/20 text-green-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Roadmap Timeline */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Roadmap Timeline
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {execution?.roadmap?.map((phase: any, idx: number) => (
                <div key={idx} className="relative">
                  {idx < (execution?.roadmap?.length - 1) && (
                    <div className="absolute left-3 top-8 h-full w-0.5 bg-border" />
                  )}
                  <div className="flex gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      phase.status === 'current' ? 'bg-primary text-primary-foreground' :
                      phase.status === 'completed' ? 'bg-green-500 text-white' :
                      'bg-muted'
                    }`}>
                      {phase.status === 'completed' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <span className="text-xs">{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{phase.phase}</p>
                        <Badge variant="outline" className="text-xs">
                          {phase.duration}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{phase.milestone}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resource Estimator */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Resource Estimator
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {execution?.resources && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Budget Range</span>
                    <HoverCard>
                      <HoverCardTrigger>
                        <AlertCircle className="h-3 w-3 text-muted-foreground" />
                      </HoverCardTrigger>
                      <HoverCardContent>
                        <p className="text-sm">Estimated budget needed to reach MVP</p>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">${execution.resources.budget?.minimum?.toLocaleString()}</Badge>
                    <span className="text-xs">to</span>
                    <Badge variant="default">${execution.resources.budget?.recommended?.toLocaleString()}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Budget Breakdown</p>
                  {Object.entries(execution.resources.budget?.breakdown || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-xs capitalize">{key}</span>
                      <span className="text-xs font-medium">${value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Timeline</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 rounded bg-background/50">
                      <p className="text-xs text-muted-foreground">To MVP</p>
                      <p className="font-bold">{execution.resources.timeToMVP}</p>
                    </div>
                    <div className="text-center p-2 rounded bg-background/50">
                      <p className="text-xs text-muted-foreground">To Revenue</p>
                      <p className="font-bold">{execution.resources.timeToRevenue}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Composition */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Team Composition
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {execution?.resources?.team?.map((member: any, idx: number) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{member.role}</p>
                    <Badge variant={member.timing === 'immediate' ? 'default' : 'secondary'}>
                      {member.timing}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Focus</span>
                      <span>{member.focus}%</span>
                    </div>
                    <Progress value={member.focus} className="h-1.5" />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {member.skills?.slice(0, 3).map((skill: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Matrix */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Risk Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {execution?.risks?.map((risk: any, idx: number) => (
              <div key={idx} className="p-3 rounded-lg border bg-background/50">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline">{risk.type}</Badge>
                  <div className="flex gap-1">
                    <Badge className={getLikelihoodColor(risk.likelihood)}>
                      {risk.likelihood}
                    </Badge>
                    <Badge variant="outline" className={getSeverityColor(risk.severity)}>
                      {risk.severity}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm font-medium mb-1">{risk.description}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Mitigation:</span> {risk.mitigation}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
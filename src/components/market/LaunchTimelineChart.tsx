import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, AlertCircle, Clock, Rocket, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LaunchTimelineChartProps {
  data: any;
}

export function LaunchTimelineChart({ data }: LaunchTimelineChartProps) {
  if (!data) return null;

  const milestones = data.milestones || [
    { 
      phase: 'Discovery & Validation',
      duration: '2 weeks',
      status: 'completed',
      tasks: ['Market research', 'Customer interviews', 'Competitor analysis', 'Value proposition'],
      progress: 100,
      date: 'Week 1-2'
    },
    {
      phase: 'MVP Development',
      duration: '6 weeks',
      status: 'in-progress',
      tasks: ['Core features', 'Basic UI/UX', 'Initial testing', 'Feedback collection'],
      progress: 45,
      date: 'Week 3-8',
      current: true
    },
    {
      phase: 'Beta Launch',
      duration: '4 weeks',
      status: 'upcoming',
      tasks: ['Beta user onboarding', 'Performance monitoring', 'Bug fixes', 'Feature refinement'],
      progress: 0,
      date: 'Week 9-12'
    },
    {
      phase: 'Go-to-Market',
      duration: '8 weeks',
      status: 'upcoming',
      tasks: ['Marketing campaign', 'Sales enablement', 'Partnership development', 'PR launch'],
      progress: 0,
      date: 'Week 13-20'
    },
    {
      phase: 'Scale & Growth',
      duration: 'Ongoing',
      status: 'future',
      tasks: ['Customer acquisition', 'Product iteration', 'Market expansion', 'Team scaling'],
      progress: 0,
      date: 'Week 21+'
    }
  ];

  const criticalPath = data.criticalPath || [
    { task: 'Complete MVP', deadline: '8 weeks', risk: 'Medium', impact: 'High' },
    { task: 'Secure initial funding', deadline: '12 weeks', risk: 'High', impact: 'Critical' },
    { task: 'Achieve 100 beta users', deadline: '16 weeks', risk: 'Medium', impact: 'High' },
    { task: 'Launch marketing campaign', deadline: '20 weeks', risk: 'Low', impact: 'Medium' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'in-progress': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'upcoming': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'in-progress': return <Clock className="h-4 w-4" />;
      case 'upcoming': return <AlertCircle className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Timeline Overview */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Product Launch Roadmap
            </CardTitle>
            <Badge variant="outline" className="bg-primary/10">
              20 Week Timeline
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <div key={index} className="relative">
                {index < milestones.length - 1 && (
                  <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-border" />
                )}
                
                <div className="flex gap-4">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    getStatusColor(milestone.status),
                    milestone.current && "ring-2 ring-primary ring-offset-2"
                  )}>
                    {getStatusIcon(milestone.status)}
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{milestone.phase}</h4>
                        <p className="text-sm text-muted-foreground">{milestone.date} • {milestone.duration}</p>
                      </div>
                      <Badge 
                        variant={milestone.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {milestone.status === 'in-progress' ? `${milestone.progress}% Complete` : milestone.status}
                      </Badge>
                    </div>
                    
                    {milestone.progress > 0 && (
                      <Progress value={milestone.progress} className="h-2" />
                    )}
                    
                    <div className="grid grid-cols-2 gap-2">
                      {milestone.tasks.map((task, taskIndex) => (
                        <div key={taskIndex} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          {task}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critical Path */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Critical Success Factors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {criticalPath.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.task}</p>
                  <p className="text-xs text-muted-foreground mt-1">Deadline: {item.deadline}</p>
                </div>
                <div className="flex gap-2">
                  <Badge 
                    variant={item.risk === 'High' ? 'destructive' : item.risk === 'Medium' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {item.risk} Risk
                  </Badge>
                  <Badge 
                    variant={item.impact === 'Critical' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {item.impact} Impact
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Launch Readiness */}
      <Alert className="border-primary/20 bg-primary/5">
        <Rocket className="h-4 w-4" />
        <AlertDescription>
          <strong>Launch Readiness Score: 72%</strong> - Currently tracking ahead of schedule with MVP development at 45% completion. 
          Key focus areas: Complete core feature development, initiate beta user recruitment, and finalize go-to-market strategy.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
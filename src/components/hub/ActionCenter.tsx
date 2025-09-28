import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Rocket, CheckCircle2, Circle, ExternalLink } from "lucide-react";

interface ActionCenterProps {
  idea: string;
}

export function ActionCenter({ idea }: ActionCenterProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const nextSteps = [
    { id: '1', task: 'Validate problem with 10 potential customers', priority: 'critical', completed: false },
    { id: '2', task: 'Create landing page with waitlist', priority: 'high', completed: false },
    { id: '3', task: 'Define MVP feature set', priority: 'high', completed: false },
    { id: '4', task: 'Research competitor pricing models', priority: 'medium', completed: false },
    { id: '5', task: 'Join relevant online communities', priority: 'medium', completed: false }
  ];

  const learningResources = [
    { title: 'The Mom Test', category: 'Customer Development', url: '#', type: 'Book' },
    { title: 'Y Combinator Startup School', category: 'Fundamentals', url: '#', type: 'Course' },
    { title: 'Lean Startup Methodology', category: 'Strategy', url: '#', type: 'Guide' }
  ];

  const communities = [
    { name: 'Indie Hackers', members: '500K+', focus: 'Bootstrapped startups', url: '#' },
    { name: 'Product Hunt', members: '4M+', focus: 'Product launches', url: '#' },
    { name: 'r/startups', members: '1.2M', focus: 'Startup advice', url: '#' }
  ];

  const toggleCheck = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const completedCount = checkedItems.size;
  const totalCount = nextSteps.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Tracker */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Success Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">MVP Readiness</span>
              <span className="text-sm font-bold">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount - completedCount}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next Steps Checklist */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Next Steps Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nextSteps.map((step) => (
                <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-colors">
                  <Checkbox
                    id={step.id}
                    checked={checkedItems.has(step.id)}
                    onCheckedChange={() => toggleCheck(step.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={step.id}
                      className={`text-sm cursor-pointer ${checkedItems.has(step.id) ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {step.task}
                    </label>
                    <Badge variant={getPriorityColor(step.priority)} className="mt-1 text-xs">
                      {step.priority}
                    </Badge>
                  </div>
                  {checkedItems.has(step.id) ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Learning Hub */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Learning Hub
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {learningResources.map((resource, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{resource.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{resource.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {resource.type}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-6 w-6">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Activation */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Network Activation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {communities.map((community, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-background/50 hover:bg-background/70 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{community.name}</p>
                    <p className="text-sm text-muted-foreground">{community.focus}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {community.members} members
                </Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" className="w-full md:w-auto">
              Find More Communities
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
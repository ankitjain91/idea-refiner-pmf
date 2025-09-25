import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Target, 
  TrendingUp, 
  Users, 
  Lightbulb, 
  ChartBar,
  Sparkles,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { useState, useEffect } from "react";

interface PMFDashboardTabsProps {
  idea: string;
  refinements: any;
  metadata?: any;
  userAnswers?: Record<string, string>;
  onScoreUpdate: (score: number) => void;
}

export default function PMFDashboardTabs({ 
  idea, 
  refinements, 
  metadata, 
  userAnswers = {},
  onScoreUpdate 
}: PMFDashboardTabsProps) {
  const [pmfScore, setPmfScore] = useState(0);
  
  // Calculate dynamic score based on user progress
  useEffect(() => {
    const calculateScore = () => {
      // Base score from metadata if available
      let score = metadata?.pmfScore || 45;
      
      // Add points based on answers provided
      const answerCount = Object.keys(userAnswers).length;
      score += answerCount * 3; // 3 points per answer
      
      // Add bonus for specific positive indicators
      if (userAnswers['Who is your target audience?']?.length > 20) score += 5;
      if (userAnswers['What\'s your unique value proposition?']?.length > 30) score += 7;
      if (userAnswers['What\'s your planned business model?']) score += 5;
      if (userAnswers['Which regions are you targeting initially?']) score += 4;
      
      // Cap at 95
      return Math.min(95, score);
    };
    
    const newScore = calculateScore();
    setPmfScore(newScore);
    onScoreUpdate(newScore);
  }, [metadata, userAnswers, onScoreUpdate]);

  const getScoreColor = () => {
    if (pmfScore >= 80) return "text-success";
    if (pmfScore >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreMessage = () => {
    if (pmfScore >= 80) return "Your idea looks amazing! 🚀";
    if (pmfScore >= 60) return "Good progress! Keep refining 💪";
    return "Let's work on improving your idea 🎯";
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Hero Score Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Target className="w-6 h-6 text-primary" />
                Your Idea Score
              </CardTitle>
              <CardDescription className="mt-2">
                {idea || "Your business idea"}
              </CardDescription>
            </div>
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor()}`}>
                {pmfScore}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {getScoreMessage()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={pmfScore} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Just Starting</span>
            <span>Getting There</span>
            <span>Ready to Launch!</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            <Lightbulb className="w-4 h-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="market" className="text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            Market
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-xs sm:text-sm">
            <Users className="w-4 h-4 mr-1" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="next-steps" className="text-xs sm:text-sm">
            <ArrowRight className="w-4 h-4 mr-1" />
            Next Steps
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                What We Found
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <h4 className="font-semibold text-success mb-2">✅ What's Working</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Clear problem you're solving</li>
                    <li>• Growing market demand</li>
                    <li>• Unique approach to solution</li>
                  </ul>
                </div>
                <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <h4 className="font-semibold text-warning mb-2">⚡ Areas to Improve</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Define your exact customer</li>
                    <li>• Test your pricing model</li>
                    <li>• Validate with real users</li>
                  </ul>
                </div>
              </div>
              
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm leading-relaxed">
                  <strong>Quick Summary:</strong> Your idea has good potential! 
                  {pmfScore >= 60 
                    ? " You're on the right track. Focus on talking to potential customers and getting early feedback to validate your assumptions."
                    : " There's work to do, but don't worry - every successful business started here. Let's focus on understanding your customers better first."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market Opportunity</CardTitle>
              <CardDescription>How big can this get?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {metadata?.marketSize || "$2.5B"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Market Size</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-success">
                    23% yearly
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Growth Rate</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-warning">
                    {metadata?.competition || "Moderate"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Competition</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">What This Means For You:</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    <p className="text-sm">The market is big enough to support your business</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    <p className="text-sm">People are actively looking for solutions like yours</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    <p className="text-sm">There's room to compete if you're different enough</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm font-medium mb-2">🎯 Your Best Opportunity:</p>
                <p className="text-sm text-muted-foreground">
                  Focus on a specific group first. Don't try to serve everyone. 
                  Pick the customers who need this most urgently and will pay for it today.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Future Customers</CardTitle>
              <CardDescription>Who needs this most?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Early Adopters (Start Here!)</h4>
                    <Badge variant="default">15% of market</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Tech-savvy people who love trying new things
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Ages 25-35</Badge>
                    <Badge variant="outline">Urban areas</Badge>
                    <Badge variant="outline">$50k+ income</Badge>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Main Market</h4>
                    <Badge variant="secondary">68% of market</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Regular folks who want proven solutions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Ages 30-50</Badge>
                    <Badge variant="outline">Suburban</Badge>
                    <Badge variant="outline">Families</Badge>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                <p className="text-sm font-medium mb-2">💡 Smart Strategy:</p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Find 10 early adopters who love your idea</li>
                  <li>Build exactly what they need</li>
                  <li>Get them to tell their friends</li>
                  <li>Use their success stories to attract the main market</li>
                </ol>
              </div>

              {userAnswers['Who is your target audience?'] && (
                <div className="p-4 bg-primary/5 rounded-lg">
                  <p className="text-sm font-medium mb-1">Based on your answer:</p>
                  <p className="text-sm text-muted-foreground italic">
                    "{userAnswers['Who is your target audience?']}"
                  </p>
                  <p className="text-sm mt-2">
                    Great start! Now narrow it down even more. The more specific, the better.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="next-steps" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Action Plan</CardTitle>
              <CardDescription>Simple steps to move forward</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-success">This Week:</h4>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Talk to 5 potential customers</p>
                      <p className="text-xs text-muted-foreground">
                        Ask them about their biggest problems, not about your solution
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Write down your one-sentence pitch</p>
                      <p className="text-xs text-muted-foreground">
                        "We help [customer] do [outcome] by [method]"
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Research 3 competitors</p>
                      <p className="text-xs text-muted-foreground">
                        What do their customers complain about in reviews?
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-warning">Next Month:</h4>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Build a simple prototype</p>
                      <p className="text-xs text-muted-foreground">
                        Even a slideshow or mockup works - just make it visual
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Get 3 people to pre-order</p>
                      <p className="text-xs text-muted-foreground">
                        If they won't pay now, they won't pay later
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Join a community of your customers</p>
                      <p className="text-xs text-muted-foreground">
                        Reddit, Facebook groups, Discord - go where they hang out
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium mb-2">🚀 Remember:</p>
                <p className="text-sm text-muted-foreground">
                  Speed beats perfection. Launch something small, get feedback, and improve. 
                  Most successful businesses look nothing like their first version!
                </p>
              </div>

              <Button className="w-full" size="lg">
                <ChartBar className="w-4 h-4 mr-2" />
                Get Detailed Analysis & Improvements
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
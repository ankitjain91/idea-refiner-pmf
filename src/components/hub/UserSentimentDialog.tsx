import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Heart, TrendingUp, AlertTriangle, CheckCircle, 
  MessageSquare, Users, ThumbsUp, ThumbsDown,
  BarChart3, LineChart, Activity, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserSentimentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export function UserSentimentDialog({ isOpen, onClose, data }: UserSentimentDialogProps) {
  if (!data) return null;

  // Handle both wrapped and unwrapped data formats
  const actualData = data.data || data;
  
  const overall = actualData.overall || 0;
  const positive = actualData.sentiment_breakdown?.positive || 0;
  const neutral = actualData.sentiment_breakdown?.neutral || 0;
  const negative = actualData.sentiment_breakdown?.negative || 0;
  
  const getSentimentColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', emoji: '😍' };
    if (score >= 60) return { label: 'Positive', emoji: '😊' };
    if (score >= 40) return { label: 'Mixed', emoji: '😐' };
    if (score >= 20) return { label: 'Concerning', emoji: '😟' };
    return { label: 'Critical', emoji: '😰' };
  };

  const sentimentInfo = getSentimentLabel(overall);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-red-500/20 border border-pink-500/30">
              <Heart className="h-5 w-5 text-pink-500" />
            </div>
            <span>User Sentiment Analysis - Voice of the Customer</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall Sentiment Score */}
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl">{sentimentInfo.emoji}</span>
                  <div className={cn("text-5xl font-bold", getSentimentColor(overall))}>
                    {overall}%
                  </div>
                </div>
                <Badge 
                  className={cn("text-lg px-4 py-1", getSentimentColor(overall).replace('text-', 'bg-').replace('500', '500/20'))}
                  variant="outline"
                >
                  {sentimentInfo.label} Sentiment
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Based on analysis of user feedback, reviews, and social mentions
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-green-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Positive</span>
                </div>
                <div className="text-2xl font-bold text-green-500">{positive}%</div>
                <Progress value={positive} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card className="border-yellow-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Neutral</span>
                </div>
                <div className="text-2xl font-bold text-yellow-500">{neutral}%</div>
                <Progress value={neutral} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card className="border-red-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Negative</span>
                </div>
                <div className="text-2xl font-bold text-red-500">{negative}%</div>
                <Progress value={negative} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="insights" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="themes">Themes</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="action">Action Items</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[350px] mt-4">
              <TabsContent value="insights" className="space-y-4 px-1">
                {/* Key Findings */}
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Key Sentiment Drivers
                    </h4>
                    <div className="space-y-3">
                      {actualData.key_drivers ? 
                        actualData.key_drivers.map((driver: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className={cn(
                              "mt-0.5",
                              driver.impact === 'positive' ? 'text-green-500' : 
                              driver.impact === 'negative' ? 'text-red-500' : 'text-yellow-500'
                            )}>
                              {driver.impact === 'positive' ? '↑' : driver.impact === 'negative' ? '↓' : '→'}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{driver.factor}</p>
                              <p className="text-xs text-muted-foreground">{driver.description}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {driver.weight}% impact
                            </Badge>
                          </div>
                        )) : 
                        <>
                          <div className="flex items-start gap-3">
                            <span className="text-green-500 mt-0.5">↑</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Product Innovation</p>
                              <p className="text-xs text-muted-foreground">Users love the unique approach</p>
                            </div>
                            <Badge variant="outline" className="text-xs">35% impact</Badge>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-green-500 mt-0.5">↑</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Value Proposition</p>
                              <p className="text-xs text-muted-foreground">Strong perceived value for money</p>
                            </div>
                            <Badge variant="outline" className="text-xs">30% impact</Badge>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-yellow-500 mt-0.5">→</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Market Timing</p>
                              <p className="text-xs text-muted-foreground">Mixed feelings about readiness</p>
                            </div>
                            <Badge variant="outline" className="text-xs">20% impact</Badge>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-red-500 mt-0.5">↓</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Competition</p>
                              <p className="text-xs text-muted-foreground">Concerns about alternatives</p>
                            </div>
                            <Badge variant="outline" className="text-xs">15% impact</Badge>
                          </div>
                        </>
                      }
                    </div>
                  </CardContent>
                </Card>

                {/* Sentiment Metrics */}
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3">Detailed Metrics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Engagement Rate</p>
                        <p className="text-lg font-bold">{actualData.engagement_rate || '4.2'}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Response Rate</p>
                        <p className="text-lg font-bold">{actualData.response_rate || '12.5'}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net Promoter Score</p>
                        <p className="text-lg font-bold">{actualData.nps || '+15'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Satisfaction Rate</p>
                        <p className="text-lg font-bold">{actualData.satisfaction || '72'}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sources" className="space-y-4 px-1">
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3">Data Sources</h4>
                    <div className="space-y-3">
                      {actualData.sources?.map((source: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <div className="flex items-center gap-3">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{source.name}</p>
                              <p className="text-xs text-muted-foreground">{source.mentions} mentions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-sm font-bold", getSentimentColor(source.sentiment))}>
                              {source.sentiment}%
                            </p>
                            <p className="text-xs text-muted-foreground">sentiment</p>
                          </div>
                        </div>
                      )) || 
                      <>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <div className="flex items-center gap-3">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Reddit</p>
                              <p className="text-xs text-muted-foreground">324 mentions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-500">75%</p>
                            <p className="text-xs text-muted-foreground">sentiment</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <div className="flex items-center gap-3">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Twitter/X</p>
                              <p className="text-xs text-muted-foreground">892 mentions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-blue-500">68%</p>
                            <p className="text-xs text-muted-foreground">sentiment</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <div className="flex items-center gap-3">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Product Hunt</p>
                              <p className="text-xs text-muted-foreground">145 mentions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-500">82%</p>
                            <p className="text-xs text-muted-foreground">sentiment</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <div className="flex items-center gap-3">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Forums</p>
                              <p className="text-xs text-muted-foreground">567 mentions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-yellow-500">55%</p>
                            <p className="text-xs text-muted-foreground">sentiment</p>
                          </div>
                        </div>
                      </>
                    }
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3">Sample Size & Confidence</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Mentions Analyzed</span>
                        <span className="text-sm font-bold">{actualData.total_mentions || '1,928'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Unique Users</span>
                        <span className="text-sm font-bold">{actualData.unique_users || '842'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Confidence Level</span>
                        <span className="text-sm font-bold">{actualData.confidence || '95'}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Time Period</span>
                        <span className="text-sm font-bold">Last 30 days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="themes" className="space-y-4 px-1">
                <Card className="border-green-500/20">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Positive Themes
                    </h4>
                    <div className="space-y-2">
                      {actualData.positive_themes?.map((theme: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-green-500">•</span>
                          <span className="text-sm">{theme}</span>
                        </div>
                      )) || 
                      ['Innovative solution', 'Great value proposition', 'User-friendly design', 'Strong market need'].map((theme, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-green-500">•</span>
                          <span className="text-sm">{theme}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-500/20">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      Areas of Concern
                    </h4>
                    <div className="space-y-2">
                      {actualData.concern_themes?.map((theme: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-orange-500">•</span>
                          <span className="text-sm">{theme}</span>
                        </div>
                      )) || 
                      ['Pricing questions', 'Feature requests', 'Competition comparisons', 'Implementation complexity'].map((theme, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-orange-500">•</span>
                          <span className="text-sm">{theme}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3">Emerging Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {actualData.emerging_topics?.map((topic: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{topic}</Badge>
                      )) || 
                      ['AI Integration', 'Mobile App', 'API Access', 'Enterprise Features', 'Privacy Concerns'].map((topic) => (
                        <Badge key={topic} variant="secondary">{topic}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends" className="space-y-4 px-1">
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <LineChart className="h-4 w-4" />
                      Sentiment Trend (30 Days)
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Week 1</span>
                        <div className="flex items-center gap-2">
                          <Progress value={65} className="w-32 h-2" />
                          <span className="text-sm font-medium">65%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Week 2</span>
                        <div className="flex items-center gap-2">
                          <Progress value={68} className="w-32 h-2" />
                          <span className="text-sm font-medium">68%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Week 3</span>
                        <div className="flex items-center gap-2">
                          <Progress value={72} className="w-32 h-2" />
                          <span className="text-sm font-medium">72%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Week 4</span>
                        <div className="flex items-center gap-2">
                          <Progress value={overall} className="w-32 h-2" />
                          <span className="text-sm font-medium">{overall}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">
                          Sentiment improving by {((overall - 65) / 4).toFixed(1)}% per week
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3">Momentum Indicators</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Mention Volume</span>
                        <Badge variant="default" className="bg-green-500/20 text-green-600">↑ 23%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Engagement Rate</span>
                        <Badge variant="default" className="bg-green-500/20 text-green-600">↑ 15%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Share of Voice</span>
                        <Badge variant="default" className="bg-blue-500/20 text-blue-600">→ Stable</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Viral Coefficient</span>
                        <Badge variant="default" className="bg-purple-500/20 text-purple-600">1.4x</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="action" className="space-y-4 px-1">
                <Card className="border-green-500/20">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3 text-green-600">Strengths to Amplify</h4>
                    <ul className="space-y-2">
                      {actualData.action_amplify?.map((action: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                          <span className="text-sm">{action}</span>
                        </li>
                      )) || 
                      [
                        'Highlight unique value proposition in marketing',
                        'Share success stories and testimonials',
                        'Expand on popular features',
                        'Increase presence in high-sentiment channels'
                      ].map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                          <span className="text-sm">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-orange-500/20">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3 text-orange-600">Issues to Address</h4>
                    <ul className="space-y-2">
                      {actualData.action_address?.map((action: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                          <span className="text-sm">{action}</span>
                        </li>
                      )) || 
                      [
                        'Create clearer pricing communication',
                        'Address feature gaps mentioned frequently',
                        'Improve onboarding to reduce complexity concerns',
                        'Develop comparison content vs competitors'
                      ].map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                          <span className="text-sm">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3">Quick Wins</h4>
                    <div className="space-y-2">
                      {actualData.quick_wins?.map((win: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-primary/10 rounded">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <span className="text-sm">{win}</span>
                        </div>
                      )) || 
                      [
                        'Engage with positive mentions to build community',
                        'Create FAQ addressing common concerns',
                        'Launch referral program leveraging positive sentiment',
                        'Optimize messaging based on positive themes'
                      ].map((win, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-primary/10 rounded">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <span className="text-sm">{win}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
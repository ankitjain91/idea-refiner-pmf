import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, TrendingUp, AlertTriangle, CheckCircle, 
  XCircle, Target, Calculator, BarChart3, 
  Zap, Shield, Users, DollarSign 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmoothBrainsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export function SmoothBrainsDialog({ isOpen, onClose, data }: SmoothBrainsDialogProps) {
  if (!data) return null;

  const score = data.score || 0;
  const tier = data.tier || 'Unknown';
  const tierColor = data.tierColor || 'gray';
  
  const getTierColorClass = (color: string) => {
    switch(color) {
      case 'gold': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'purple': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'blue': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'green': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'yellow': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'orange': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'red': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'text-yellow-500';
    if (score >= 70) return 'text-purple-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 50) return 'text-green-500';
    if (score >= 40) return 'text-yellow-600';
    if (score >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('market')) return DollarSign;
    if (category.includes('competition') || category.includes('competitive')) return Shield;
    if (category.includes('user') || category.includes('problem')) return Users;
    if (category.includes('revenue') || category.includes('margin')) return TrendingUp;
    if (category.includes('timing') || category.includes('trend')) return Zap;
    return Target;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <Brain className="h-5 w-5 text-purple-500" />
            </div>
            <span>SmoothBrains™ Score - Rigorous Startup Evaluation</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Score Display */}
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div className={cn("text-6xl font-bold", getScoreColorClass(score))}>
                  {score}
                  <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <Badge 
                  className={cn("text-lg px-4 py-1 border", getTierColorClass(tierColor))}
                  variant="outline"
                >
                  {tier}
                </Badge>
                {data.comparison && (
                  <p className="text-sm text-muted-foreground">
                    Comparable to: <span className="font-medium">{data.comparison}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="formula">Formula</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="overview" className="space-y-4 px-1">
                {/* Analysis Summary */}
                {data.analysis && (
                  <div className="space-y-4">
                    {/* Verdict */}
                    {data.analysis.verdict && (
                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Calculator className="h-4 w-4" />
                            Expert Verdict
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {data.analysis.verdict}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Success Probability */}
                    {data.analysis.successProbability && (
                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold mb-2">Success Probability</h4>
                          <p className="text-2xl font-bold text-primary">
                            {data.analysis.successProbability}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Strengths */}
                    {data.analysis.strengths && data.analysis.strengths.length > 0 && (
                      <Card className="border-green-500/20">
                        <CardContent className="pt-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Key Strengths
                          </h4>
                          <ul className="space-y-2">
                            {data.analysis.strengths.map((strength: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">•</span>
                                <span className="text-sm">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Weaknesses */}
                    {data.analysis.weaknesses && data.analysis.weaknesses.length > 0 && (
                      <Card className="border-orange-500/20">
                        <CardContent className="pt-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="h-4 w-4" />
                            Critical Weaknesses
                          </h4>
                          <ul className="space-y-2">
                            {data.analysis.weaknesses.map((weakness: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-orange-500 mt-0.5">•</span>
                                <span className="text-sm">{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Killer Risks */}
                    {data.analysis.killerRisks && data.analysis.killerRisks.length > 0 && (
                      <Card className="border-red-500/20">
                        <CardContent className="pt-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-red-600">
                            <XCircle className="h-4 w-4" />
                            Company-Killing Risks
                          </h4>
                          <ul className="space-y-2">
                            {data.analysis.killerRisks.map((risk: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">⚠</span>
                                <span className="text-sm font-medium">{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="formula" className="space-y-4 px-1">
                {data.formula && (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="pt-4">
                        <h4 className="font-semibold mb-3">Mathematical Formula</h4>
                        <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm">
                          {data.formula.description}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Components Evaluated</p>
                            <p className="text-2xl font-bold">{data.formula.components}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Difficulty Exponent</p>
                            <p className="text-2xl font-bold">{data.formula.difficultyExponent}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <h4 className="font-semibold mb-3">Scoring Philosophy</h4>
                        <p className="text-sm text-muted-foreground">
                          {data.formula.explanation}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <h4 className="font-semibold mb-3">Methodology</h4>
                        <p className="text-sm text-muted-foreground">
                          {data.metadata?.methodology || 'VC-grade evaluation with exponential difficulty scaling'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="breakdown" className="space-y-4 px-1">
                {data.scoreBreakdown && (
                  <div className="space-y-3">
                    {Object.entries(data.scoreBreakdown).map(([key, value]: [string, any]) => {
                      const Icon = getCategoryIcon(key);
                      const percentage = value.adjusted || 0;
                      
                      return (
                        <Card key={key}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold">{value.raw}%</span>
                                {value.raw !== value.adjusted && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    → {value.adjusted}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-muted-foreground">
                                Weight: {(value.weight * 100).toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Contribution: {value.contribution} pts
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                
                {!data.scoreBreakdown && (
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Detailed breakdown requires enhanced analysis mode
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="benchmarks" className="space-y-4 px-1">
                {data.benchmarks && (
                  <div className="space-y-3">
                    {Object.entries(data.benchmarks).map(([scoreThreshold, description]) => {
                      const threshold = parseInt(scoreThreshold);
                      const isCurrentRange = score >= threshold && score < threshold + 10;
                      
                      return (
                        <Card 
                          key={scoreThreshold}
                          className={cn(
                            "transition-all",
                            isCurrentRange && "border-primary ring-2 ring-primary/20"
                          )}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "text-2xl font-bold",
                                  getScoreColorClass(threshold)
                                )}>
                                  {scoreThreshold}+
                                </div>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                              </div>
                              {isCurrentRange && (
                                <Badge variant="default">Your Range</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {String(description)}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
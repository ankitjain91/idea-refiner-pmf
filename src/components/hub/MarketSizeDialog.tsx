import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, DollarSign, Users, Globe, 
  Target, Building, BarChart3, PieChart,
  Calendar, MapPin, Layers, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketSizeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export function MarketSizeDialog({ isOpen, onClose, data }: MarketSizeDialogProps) {
  if (!data) return null;

  // Handle both wrapped and unwrapped data formats
  const actualData = data.data || data;
  
  const tam = actualData.tam || 0;
  const sam = actualData.sam || 0;
  const som = actualData.som || 0;
  const cagr = actualData.cagr || 0;
  
  const getMarketSizeColor = (value: number) => {
    const billions = value / 1000000000;
    if (billions >= 100) return 'text-yellow-500';
    if (billions >= 50) return 'text-purple-500';
    if (billions >= 10) return 'text-blue-500';
    if (billions >= 1) return 'text-green-500';
    return 'text-orange-500';
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const getGrowthRateIndicator = (rate: number) => {
    if (rate >= 30) return { label: 'Hypergrowth', color: 'text-purple-500', icon: '🚀' };
    if (rate >= 20) return { label: 'High Growth', color: 'text-green-500', icon: '📈' };
    if (rate >= 10) return { label: 'Moderate Growth', color: 'text-blue-500', icon: '📊' };
    if (rate >= 5) return { label: 'Steady Growth', color: 'text-yellow-500', icon: '📉' };
    return { label: 'Low Growth', color: 'text-red-500', icon: '⚠️' };
  };

  const growthIndicator = getGrowthRateIndicator(cagr);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-green-500/20 border border-blue-500/30">
              <Globe className="h-5 w-5 text-blue-500" />
            </div>
            <span>Market Size Analysis - Comprehensive Market Opportunity</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Market Overview Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">TAM (Total Market)</span>
                  <Target className="h-4 w-4 text-primary/60" />
                </div>
                <div className={cn("text-2xl font-bold", getMarketSizeColor(tam))}>
                  {formatCurrency(tam)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum revenue opportunity
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">SAM (Serviceable Market)</span>
                  <Building className="h-4 w-4 text-primary/60" />
                </div>
                <div className={cn("text-2xl font-bold", getMarketSizeColor(sam))}>
                  {formatCurrency(sam)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Reachable with current model
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">SOM (Obtainable Market)</span>
                  <DollarSign className="h-4 w-4 text-primary/60" />
                </div>
                <div className={cn("text-2xl font-bold", getMarketSizeColor(som))}>
                  {formatCurrency(som)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Realistic 5-year capture
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Growth Rate Card */}
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Market Growth Rate (CAGR)</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-3xl font-bold", growthIndicator.color)}>
                      {cagr}%
                    </span>
                    <span className="text-2xl">{growthIndicator.icon}</span>
                  </div>
                  <Badge className="mt-2" variant="outline">
                    {growthIndicator.label}
                  </Badge>
                </div>
                <TrendingUp className={cn("h-8 w-8", growthIndicator.color)} />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="breakdown" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="methodology">Methodology</TabsTrigger>
              <TabsTrigger value="segments">Segments</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[350px] mt-4">
              <TabsContent value="breakdown" className="space-y-4 px-1">
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Market Funnel Analysis
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">TAM → SAM Conversion</span>
                          <span className="text-sm font-bold">{((sam/tam) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(sam/tam) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">SAM → SOM Conversion</span>
                          <span className="text-sm font-bold">{((som/sam) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(som/sam) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Overall Capture Rate</span>
                          <span className="text-sm font-bold">{((som/tam) * 100).toFixed(2)}%</span>
                        </div>
                        <Progress value={(som/tam) * 100} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {actualData.assumptions && (
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-semibold mb-3">Key Assumptions</h4>
                      <ul className="space-y-2">
                        {actualData.assumptions.map((assumption: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span className="text-sm">{assumption}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="methodology" className="space-y-4 px-1">
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3">Calculation Methodology</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-primary">TAM Calculation</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Top-down approach using industry reports, market research, and global spending data.
                          Considers all potential customers if geographical and logistical barriers didn't exist.
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">SAM Calculation</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Bottom-up analysis of addressable segments, accounting for business model constraints,
                          geographic reach, and regulatory limitations.
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">SOM Calculation</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Conservative estimate based on competitive analysis, market penetration rates,
                          and realistic growth projections over 5 years.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3">Data Sources</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['Industry Reports', 'Government Data', 'Trade Associations', 'Market Research Firms', 
                        'Competitor Analysis', 'Customer Surveys'].map((source) => (
                        <Badge key={source} variant="outline" className="justify-center">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="segments" className="space-y-4 px-1">
                {actualData.segments ? (
                  <div className="space-y-3">
                    {actualData.segments.map((segment: any, idx: number) => (
                      <Card key={idx}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{segment.name}</h4>
                            <Badge>{segment.priority}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Size</p>
                              <p className="text-sm font-bold">{formatCurrency(segment.size)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Growth</p>
                              <p className="text-sm font-bold">{segment.growth}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Penetration</p>
                              <p className="text-sm font-bold">{segment.penetration}%</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <span className="text-sm">Enterprise Segment</span>
                          <span className="text-sm font-bold">40%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <span className="text-sm">Mid-Market</span>
                          <span className="text-sm font-bold">35%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <span className="text-sm">Small Business</span>
                          <span className="text-sm font-bold">25%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="trends" className="space-y-4 px-1">
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Market Drivers
                    </h4>
                    <div className="space-y-2">
                      {actualData.drivers?.map((driver: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                          <span className="text-sm">{driver}</span>
                        </div>
                      )) || [
                        'Digital transformation acceleration',
                        'Changing consumer behaviors',
                        'Regulatory changes',
                        'Technology advancement'
                      ].map((driver, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                          <span className="text-sm">{driver}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3">Geographic Distribution</h4>
                    <div className="space-y-2">
                      {['North America: 35%', 'Europe: 28%', 'Asia Pacific: 25%', 'Rest of World: 12%'].map((region) => (
                        <div key={region} className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{region}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="benchmarks" className="space-y-4 px-1">
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3">Market Size Benchmarks</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-yellow-500/10 rounded">
                        <p className="text-sm font-medium">$100B+ TAM</p>
                        <p className="text-xs text-muted-foreground">Massive markets: Cloud computing, E-commerce</p>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded">
                        <p className="text-sm font-medium">$10-100B TAM</p>
                        <p className="text-xs text-muted-foreground">Large markets: SaaS, Digital advertising</p>
                      </div>
                      <div className="p-3 bg-blue-500/10 rounded">
                        <p className="text-sm font-medium">$1-10B TAM</p>
                        <p className="text-xs text-muted-foreground">Mid-size markets: Niche software, Specialized services</p>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded">
                        <p className="text-sm font-medium">$100M-1B TAM</p>
                        <p className="text-xs text-muted-foreground">Small markets: Local services, Specialty products</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3">Success Indicators</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">TAM &gt; $1B: VC fundable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">CAGR &gt; 15%: High growth potential</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">SOM/SAM &gt; 10%: Realistic targets</span>
                      </div>
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
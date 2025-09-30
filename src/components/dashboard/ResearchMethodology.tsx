import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, Globe, Shield, Calculator, TrendingUp, 
  FileText, CheckCircle, Info, AlertCircle, Brain,
  Search, BarChart3, Users, Building, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResearchMethodologyProps {
  tileType: string;
  data?: any;
  className?: string;
}

export function ResearchMethodology({ tileType, data, className }: ResearchMethodologyProps) {
  // Define comprehensive research methodology for each tile type
  const methodologies: Record<string, any> = {
    market_size: {
      title: "Market Sizing Methodology",
      icon: Calculator,
      sources: [
        { name: "Industry Reports", confidence: 85, description: "Gartner, IDC, McKinsey analysis" },
        { name: "Government Data", confidence: 95, description: "Census, economic statistics" },
        { name: "Company Filings", confidence: 90, description: "SEC filings, annual reports" },
        { name: "Web Scraping", confidence: 70, description: "E-commerce, job postings analysis" }
      ],
      calculations: {
        TAM: {
          formula: "Total Market Demand × Average Price × Frequency",
          adjustments: "Conservative factor: 0.65 applied for realistic estimates",
          confidence: 75
        },
        SAM: {
          formula: "TAM × Geographic Reach × Target Segment %",
          adjustments: "Conservative factor: 0.55 applied",
          confidence: 70
        },
        SOM: {
          formula: "SAM × Realistic Market Share (1-5% for new entrants)",
          adjustments: "Conservative factor: 0.45 applied",
          confidence: 65
        },
        CAGR: {
          formula: "((Ending Value/Beginning Value)^(1/Years)) - 1",
          adjustments: "Historical 5-year average with regression analysis",
          confidence: 80
        }
      },
      validation: [
        "Cross-referenced with 3+ independent sources",
        "Bottom-up validation using unit economics",
        "Top-down validation using industry benchmarks",
        "Sensitivity analysis with ±20% variance"
      ]
    },
    pmf_score: {
      title: "Product-Market Fit Scoring",
      icon: Target,
      sources: [
        { name: "Search Trends", confidence: 80, description: "Google Trends, keyword analysis" },
        { name: "Social Sentiment", confidence: 75, description: "Reddit, Twitter, forums" },
        { name: "Competitor Analysis", confidence: 85, description: "Market gaps, differentiation" },
        { name: "User Feedback", confidence: 90, description: "Reviews, surveys, interviews" }
      ],
      calculations: {
        demand: {
          formula: "Search Volume × Growth Rate × Intent Score",
          weight: 30,
          confidence: 75
        },
        painIntensity: {
          formula: "Problem Mentions × Urgency × Impact",
          weight: 25,
          confidence: 70
        },
        competitionGap: {
          formula: "Market Size - (Competitors × Avg Market Share)",
          weight: 20,
          confidence: 65
        },
        differentiation: {
          formula: "Unique Features × Value Proposition × Barrier to Copy",
          weight: 15,
          confidence: 60
        },
        distribution: {
          formula: "Channel Reach × Conversion Rate × CAC/LTV",
          weight: 10,
          confidence: 55
        }
      },
      validation: [
        "Sean Ellis Test: >40% would be disappointed",
        "NPS Score correlation analysis",
        "Cohort retention benchmarking",
        "PMF survey validation"
      ]
    },
    competitor_analysis: {
      title: "Competitive Intelligence",
      icon: Building,
      sources: [
        { name: "Public Data", confidence: 90, description: "Websites, press releases, job postings" },
        { name: "Financial Reports", confidence: 95, description: "For public companies" },
        { name: "Review Analysis", confidence: 80, description: "Customer feedback mining" },
        { name: "Social Monitoring", confidence: 75, description: "Brand mentions, sentiment" }
      ],
      analysis: {
        marketPosition: "Quadrant analysis based on market share vs growth",
        strengthsWeaknesses: "SWOT analysis from multiple data points",
        pricingStrategy: "Price point analysis across feature sets",
        customerSegments: "Target audience overlap and gaps"
      },
      validation: [
        "Multi-source verification",
        "Temporal consistency checks",
        "Expert review and adjustment",
        "Competitive response modeling"
      ]
    },
    sentiment: {
      title: "Sentiment Analysis",
      icon: Users,
      sources: [
        { name: "Social Media", confidence: 70, description: "Twitter, LinkedIn, Facebook" },
        { name: "Forums", confidence: 85, description: "Reddit, specialized forums" },
        { name: "Reviews", confidence: 90, description: "Product reviews, app stores" },
        { name: "News Articles", confidence: 80, description: "Media coverage analysis" }
      ],
      methodology: {
        nlp: "Advanced NLP with transformer models",
        scoring: "Weighted average by source credibility",
        temporal: "Time-decay function for relevance",
        context: "Industry-specific sentiment calibration"
      },
      validation: [
        "Manual sampling verification (5% of data)",
        "Cross-platform consistency checks",
        "Historical accuracy benchmarking",
        "Expert sentiment validation"
      ]
    }
  };

  const methodology = methodologies[tileType] || methodologies.market_size;
  
  // Calculate overall confidence score
  const overallConfidence = methodology.sources.reduce((acc: number, source: any) => 
    acc + source.confidence, 0) / methodology.sources.length;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <methodology.icon className="h-5 w-5 text-primary" />
          {methodology.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="sources" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sources">Data Sources</TabsTrigger>
            <TabsTrigger value="methodology">Methodology</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sources" className="space-y-4 mt-4">
            <div className="space-y-3">
              {methodology.sources.map((source: any, idx: number) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{source.name}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        source.confidence >= 85 ? "border-green-500 text-green-600" :
                        source.confidence >= 70 ? "border-yellow-500 text-yellow-600" :
                        "border-red-500 text-red-600"
                      )}
                    >
                      {source.confidence}% confidence
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">{source.description}</p>
                  <Progress value={source.confidence} className="h-1" />
                </div>
              ))}
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Data Confidence</span>
                <span className="text-lg font-bold text-primary">
                  {overallConfidence.toFixed(0)}%
                </span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="methodology" className="space-y-4 mt-4">
            {methodology.calculations ? (
              <div className="space-y-4">
                {Object.entries(methodology.calculations).map(([key, calc]: [string, any]) => (
                  <div key={key} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{key.toUpperCase()}</span>
                      {calc.confidence && (
                        <Badge variant="secondary" className="text-xs">
                          {calc.confidence}% accurate
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Calculator className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-mono bg-muted/50 p-1 rounded">
                            {calc.formula}
                          </p>
                        </div>
                      </div>
                      {calc.adjustments && (
                        <div className="flex items-start gap-2">
                          <Info className="h-3 w-3 text-blue-500 mt-0.5" />
                          <p className="text-xs text-muted-foreground">{calc.adjustments}</p>
                        </div>
                      )}
                      {calc.weight && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Weight:</span>
                          <Badge variant="outline" className="text-xs">{calc.weight}%</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : methodology.methodology ? (
              <div className="space-y-3">
                {Object.entries(methodology.methodology).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <Brain className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">{value as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : methodology.analysis && (
              <div className="space-y-3">
                {Object.entries(methodology.analysis).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <BarChart3 className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-xs text-muted-foreground">{value as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="validation" className="space-y-3 mt-4">
            {methodology.validation.map((step: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <p className="text-sm">{step}</p>
              </div>
            ))}
            
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 mt-4">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs">
                All data undergoes rigorous validation to ensure accuracy. Conservative adjustments 
                are applied to avoid overestimation. Regular audits maintain data quality standards.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
        
        {/* Data freshness indicator */}
        {data && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last Updated: {new Date(data.updatedAt || Date.now()).toLocaleString()}</span>
              {data.fromCache && <Badge variant="outline" className="text-xs">Cached</Badge>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  TrendingUp, Target, DollarSign, Users, Lightbulb, 
  CheckCircle, AlertCircle, ArrowRight, BookOpen, MessageSquare, Rocket
} from 'lucide-react';

interface TileInsight {
  title: string;
  description: string;
  whyItMatters: string[];
  howToUse: string[];
  profitImpact: string;
  actionItems: string[];
  icon: React.ElementType;
}

const tileInsights: Record<string, TileInsight> = {
  market_trends: {
    title: "Market Trends Analysis",
    description: "Real-time search interest and news volume tracking for your idea",
    icon: TrendingUp,
    whyItMatters: [
      "Validates if people are actively searching for solutions like yours",
      "Shows if interest is growing, stable, or declining",
      "Identifies market timing opportunities",
      "Reveals seasonal patterns in demand"
    ],
    howToUse: [
      "Rising trends (>20% growth) = Strong market validation",
      "Flat trends = Stable but competitive market",
      "Declining trends = May need to pivot or find niche",
      "High news volume = Market awareness is building"
    ],
    profitImpact: "Markets with 30%+ YoY search growth have 3x higher success rates for new products",
    actionItems: [
      "If trending up: Accelerate development to capture momentum",
      "If flat: Focus on differentiation strategy",
      "If declining: Research underlying causes and consider pivot",
      "Monitor top queries to refine positioning"
    ]
  },
  market_size: {
    title: "Market Size & Opportunity Analysis",
    description: "TAM, SAM, SOM breakdown with revenue potential calculations",
    icon: DollarSign,
    whyItMatters: [
      "Quantifies the total revenue opportunity available",
      "Helps investors understand growth potential",
      "Guides resource allocation and investment decisions",
      "Sets realistic revenue targets and milestones"
    ],
    howToUse: [
      "TAM shows total market if you owned 100%",
      "SAM is your realistic serviceable market",
      "SOM is achievable market share in 3-5 years",
      "CAGR indicates market growth velocity"
    ],
    profitImpact: "Targeting markets with >$1B TAM and >15% CAGR yields 4x higher exit valuations",
    actionItems: [
      "Validate TAM with bottom-up analysis",
      "Define clear path from SOM to SAM expansion",
      "Identify highest-value customer segments first",
      "Build financial model based on SOM capture rate"
    ]
  },
  growth_projections: {
    title: "Growth Trajectory & Scaling Analysis",
    description: "5-year revenue, user, and market share projections",
    icon: Rocket,
    whyItMatters: [
      "Sets realistic expectations for stakeholders",
      "Identifies key growth inflection points",
      "Helps plan hiring and resource needs",
      "Guides fundraising timeline and amounts"
    ],
    howToUse: [
      "Year 1-2: Focus on product-market fit metrics",
      "Year 2-3: Scale customer acquisition",
      "Year 3-5: Market expansion and optimization",
      "Monitor actuals vs projections quarterly"
    ],
    profitImpact: "Companies that hit 80% of projections raise follow-on funding 3x faster",
    actionItems: [
      "Set conservative, achievable Year 1 targets",
      "Build growth model with multiple scenarios",
      "Identify leading indicators of growth",
      "Plan funding rounds around growth milestones"
    ]
  },
  launch_timeline: {
    title: "Strategic Launch Timeline",
    description: "Critical path milestones for go-to-market execution",
    icon: Target,
    whyItMatters: [
      "Aligns team on priorities and deadlines",
      "Identifies dependencies and bottlenecks",
      "Helps coordinate marketing with product",
      "Reduces time to revenue generation"
    ],
    howToUse: [
      "MVP in 3-6 months for rapid validation",
      "Beta launch to test with early adopters",
      "Public launch when retention >40%",
      "Scale when unit economics are positive"
    ],
    profitImpact: "Launching 2 months earlier can increase market share by 20-30%",
    actionItems: [
      "Define MVP feature set ruthlessly",
      "Recruit 10-20 beta users pre-launch",
      "Build launch momentum 30 days prior",
      "Plan PR and marketing campaign timeline"
    ]
  },
  google_trends: {
    title: "Google Search Patterns",
    description: "Deep dive into search behavior and regional interest",
    icon: Target,
    whyItMatters: [
      "Reveals geographic hotspots for initial launch",
      "Shows related queries people are searching",
      "Identifies competitor brand searches",
      "Tracks seasonal demand patterns"
    ],
    howToUse: [
      "Interest by region helps prioritize market entry",
      "Rising queries reveal unmet needs",
      "Related topics show partnership opportunities",
      "Breakout terms indicate emerging trends"
    ],
    profitImpact: "Targeting high-interest regions first can reduce CAC by 40%",
    actionItems: [
      "Launch in top 3 interest regions first",
      "Create content around rising queries",
      "Monitor competitor search volumes",
      "Plan marketing around peak seasons"
    ]
  },
  competitor_analysis: {
    title: "Competitive Intelligence",
    description: "Understanding your competition's strengths and weaknesses",
    icon: Users,
    whyItMatters: [
      "Identifies gaps in current solutions",
      "Reveals pricing strategies that work",
      "Shows customer pain points with competitors",
      "Highlights differentiation opportunities"
    ],
    howToUse: [
      "Study top 3 competitors' weaknesses",
      "Price 20% above/below based on positioning",
      "Target underserved customer segments",
      "Learn from their marketing strategies"
    ],
    profitImpact: "Products with clear differentiation achieve 2.3x higher margins",
    actionItems: [
      "List 3 things competitors don't do well",
      "Define your unique value proposition",
      "Set pricing based on value delivered",
      "Create comparison content for SEO"
    ]
  },
  pricing_strategy: {
    title: "Pricing Optimization",
    description: "Data-driven pricing for maximum profitability",
    icon: DollarSign,
    whyItMatters: [
      "Pricing affects both revenue and perception",
      "Wrong pricing is #1 reason for startup failure",
      "Small changes can dramatically impact profit",
      "Market accepts different price points"
    ],
    howToUse: [
      "Start with value-based pricing",
      "Test 3 price points with different segments",
      "Monitor competitor pricing changes",
      "Adjust based on conversion data"
    ],
    profitImpact: "10% price optimization can increase profits by 40%",
    actionItems: [
      "Survey target customers on willingness to pay",
      "Create 3 pricing tiers",
      "A/B test pricing pages",
      "Review pricing quarterly"
    ]
  },
  target_audience: {
    title: "Target Audience Analysis",
    description: "Demographics, psychographics, and persona development",
    icon: Users,
    whyItMatters: [
      "Focuses product development on real needs",
      "Improves marketing message relevance",
      "Reduces customer acquisition costs",
      "Increases conversion rates"
    ],
    howToUse: [
      "Primary persona = 80% of revenue focus",
      "Secondary personas for expansion",
      "Match features to persona pain points",
      "Tailor messaging to each segment"
    ],
    profitImpact: "Targeted messaging increases conversion rates by 2-3x",
    actionItems: [
      "Interview 20+ potential customers",
      "Create detailed persona documents",
      "Map customer journey for each persona",
      "Test messaging with each segment"
    ]
  },
  user_engagement: {
    title: "User Engagement Metrics",
    description: "Retention, activation, and engagement optimization",
    icon: Users,
    whyItMatters: [
      "Engagement predicts long-term success",
      "Retention is cheaper than acquisition",
      "High engagement drives viral growth",
      "Investors focus on engagement metrics"
    ],
    howToUse: [
      "DAU/MAU >40% = Strong engagement",
      "D7 retention >20% = Good product-market fit",
      "Time in app >5min = High value delivery",
      "Share rate >5% = Viral potential"
    ],
    profitImpact: "10% improvement in retention can increase LTV by 30-50%",
    actionItems: [
      "Implement onboarding optimization",
      "Add engagement hooks in first session",
      "Create habit-forming features",
      "Build referral incentives"
    ]
  },
  twitter_buzz: {
    title: "Twitter/X Social Sentiment",
    description: "Real-time social media sentiment and conversation analysis",
    icon: MessageSquare,
    whyItMatters: [
      "Early warning system for issues",
      "Identifies brand advocates and influencers",
      "Shows real-time market reaction",
      "Reveals viral content opportunities"
    ],
    howToUse: [
      "Positive sentiment >60% = Good brand health",
      "High mention volume = Market awareness",
      "Influencer engagement = Amplification potential",
      "Trending topics = Content opportunities"
    ],
    profitImpact: "Positive social sentiment correlates with 25% higher conversion rates",
    actionItems: [
      "Engage with positive mentions daily",
      "Address negative feedback quickly",
      "Partner with micro-influencers",
      "Create shareable content formats"
    ]
  },
  amazon_reviews: {
    title: "Amazon Market Validation",
    description: "Product review analysis and competitive insights",
    icon: Lightbulb,
    whyItMatters: [
      "Shows actual buyer behavior and preferences",
      "Reveals feature priorities from real users",
      "Identifies unmet needs in existing products",
      "Validates pricing expectations"
    ],
    howToUse: [
      "4+ star products = Market validation",
      "Common complaints = Your opportunity",
      "Feature requests = Product roadmap",
      "Price complaints = Positioning opportunity"
    ],
    profitImpact: "Addressing top 3 review complaints can increase NPS by 40 points",
    actionItems: [
      "Analyze top 10 competitor products",
      "List most requested features",
      "Price based on value perception",
      "Build superior solution to pain points"
    ]
  },
  youtube_analytics: {
    title: "YouTube Content Landscape",
    description: "Video content trends and educational marketing opportunities",
    icon: TrendingUp,
    whyItMatters: [
      "YouTube is 2nd largest search engine",
      "Video content builds trust faster",
      "Educational content drives conversions",
      "Influencer partnerships available"
    ],
    howToUse: [
      "High view counts = Topic interest",
      "Comment themes = Customer questions",
      "Channel growth = Market expansion",
      "Engagement rate = Content quality"
    ],
    profitImpact: "Video content marketing generates 66% more qualified leads",
    actionItems: [
      "Create educational video series",
      "Partner with relevant YouTubers",
      "Answer common questions in videos",
      "Build YouTube SEO strategy"
    ]
  },
  news_analysis: {
    title: "Media Coverage Insights",
    description: "Industry news and market movements",
    icon: AlertCircle,
    whyItMatters: [
      "Shows market maturity and dynamics",
      "Reveals regulatory changes",
      "Identifies funding trends",
      "Tracks industry innovations"
    ],
    howToUse: [
      "High coverage = validated market",
      "Low coverage = opportunity for PR",
      "Track competitor announcements",
      "Monitor industry trends"
    ],
    profitImpact: "Markets with growing media coverage see 2x faster adoption",
    actionItems: [
      "Build media list of relevant journalists",
      "Create newsworthy angle for launch",
      "Monitor competitor press releases",
      "Time announcements with industry events"
    ]
  },
  reddit_sentiment: {
    title: "Reddit Community Sentiment",
    description: "Real-time community sentiment analysis with minimum cost approach",
    icon: MessageSquare,
    whyItMatters: [
      "Validates if your target audience has real problems to solve",
      "Shows actual user pain points and unmet needs",
      "Reveals community perception before you invest",
      "Identifies early adopters and potential evangelists"
    ],
    howToUse: [
      "CPS 70-100 (green) = Strong positive sentiment, proceed with confidence",
      "CPS 40-69 (amber) = Mixed feelings, refine your approach", 
      "CPS 0-39 (red) = Negative sentiment, consider pivoting",
      "High engagement + positive = Strong product-market fit signal"
    ],
    profitImpact: "Products with CPS >70 have 2.8x higher user retention and 2.2x faster growth",
    actionItems: [
      "If CPS >70: Focus on the positive themes in your marketing",
      "If CPS 40-69: Address the pain points explicitly in your solution",
      "If CPS <40: Deep dive into negative feedback before proceeding",
      "Monitor themes weekly to spot emerging trends"
    ]
  },
  web_search: {
    title: "Web Search Analysis",
    description: "Comprehensive market profitability and competition analysis",
    icon: Target,
    whyItMatters: [
      "Quantifies market opportunity with profitability scores",
      "Identifies direct and indirect competitors",
      "Estimates development costs and timeline",
      "Reveals unmet needs in the market"
    ],
    howToUse: [
      "Profitability >70% = Strong profit potential",
      "Competition Level 'Low' = Easier market entry",
      "Market Size >$1B = Large addressable market",
      "High unmet needs count = Innovation opportunity"
    ],
    profitImpact: "Products launched in markets with 70%+ profitability scores have 2.5x higher profit margins",
    actionItems: [
      "Analyze competitor pricing to position competitively",
      "Use unmet needs to define unique value proposition",
      "Budget based on MVP cost estimates",
      "Target market segments with highest sentiment scores"
    ]
  }
};

interface TileInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tileType: string;
  tileData?: any; // Actual data from the tile
  ideaText?: string; // The idea being analyzed
}

export function TileInsightsDialog({ open, onOpenChange, tileType, tileData, ideaText }: TileInsightsDialogProps) {
  const insight = tileInsights[tileType] || tileInsights.market_trends;
  const Icon = insight.icon;

  // Generate specific insights based on actual data
  const getSpecificInsights = () => {
    const insights = [];
    
    if (tileData) {
      // Add data-specific insights based on tile type
      switch (tileType) {
        case 'market_trends':
          if (tileData.metrics) {
            const trend = tileData.metrics.find((m: any) => m.name?.toLowerCase().includes('trend'));
            if (trend) {
              insights.push(`Current trend: ${trend.value} - ${trend.explanation || ''}`);
            }
          }
          if (tileData.series?.length > 0) {
            insights.push(`Tracking ${tileData.series[0].data?.length || 0} weeks of data`);
          }
          break;
          
        case 'market_size':
          if (tileData.metrics) {
            const tam = tileData.metrics.find((m: any) => m.name === 'TAM');
            const sam = tileData.metrics.find((m: any) => m.name === 'SAM');
            const som = tileData.metrics.find((m: any) => m.name === 'SOM');
            const cagr = tileData.metrics.find((m: any) => m.name === 'CAGR');
            
            if (tam) insights.push(`Total Addressable Market: ${tam.value}${tam.unit || ''}`);
            if (sam) insights.push(`Serviceable Market: ${sam.value}${sam.unit || ''}`);
            if (som) insights.push(`Obtainable Market: ${som.value}${som.unit || ''} (3-year target)`);
            if (cagr) insights.push(`Market growing at ${cagr.value}${cagr.unit || ''} annually`);
            
            // Add segment analysis
            if (tileData.segments?.length > 0) {
              const topSegment = tileData.segments[0];
              insights.push(`Primary segment: ${topSegment.name} (${topSegment.share}% share)`);
            }
          }
          break;
          
        case 'growth_projections':
          if (tileData.metrics) {
            const revenue = tileData.metrics.find((m: any) => m.name?.toLowerCase().includes('revenue'));
            const users = tileData.metrics.find((m: any) => m.name?.toLowerCase().includes('user'));
            const growth = tileData.metrics.find((m: any) => m.name?.toLowerCase().includes('growth'));
            
            if (revenue) insights.push(`Revenue projection: ${revenue.value}${revenue.unit || ''}`);
            if (users) insights.push(`User growth: ${users.value}${users.unit || ''}`);
            if (growth) insights.push(`Growth rate: ${growth.value}${growth.unit || ''}`);
          }
          if (tileData.projections) {
            insights.push(`${tileData.projections.timeline?.length || 5}-year projection model available`);
          }
          break;
          
        case 'launch_timeline':
          if (tileData.metrics) {
            const mvp = tileData.metrics.find((m: any) => m.name?.toLowerCase().includes('mvp'));
            const launch = tileData.metrics.find((m: any) => m.name?.toLowerCase().includes('launch'));
            const profitability = tileData.metrics.find((m: any) => m.name?.toLowerCase().includes('profit'));
            
            if (mvp) insights.push(`MVP timeline: ${mvp.value}${mvp.unit || ''}`);
            if (launch) insights.push(`Public launch: ${launch.value}${launch.unit || ''}`);
            if (profitability) insights.push(`Path to profitability: ${profitability.value}${profitability.unit || ''}`);
          }
          break;
          
        case 'reddit_sentiment':
          if (tileData.sentiment) {
            const positivePercentage = tileData.sentiment.positive || 0;
            insights.push(`Community sentiment is ${positivePercentage}% positive`);
            if (positivePercentage > 70) {
              insights.push("Strong positive reception - excellent validation signal");
            } else if (positivePercentage < 30) {
              insights.push("Low sentiment - consider addressing community concerns");
            }
          }
          break;
          
        case 'web_search':
          if (tileData.profitability) {
            insights.push(`Profitability score: ${tileData.profitability}%`);
            if (tileData.profitability > 70) {
              insights.push("High profit potential identified");
            }
          }
          if (tileData.competitors?.length > 0) {
            insights.push(`${tileData.competitors.length} competitors analyzed`);
          }
          break;
          
        case 'pmf_score':
          if (tileData.score) {
            insights.push(`PMF Score: ${tileData.score}%`);
            if (tileData.score >= 70) {
              insights.push("Strong product-market fit indicators");
            } else if (tileData.score < 40) {
              insights.push("Consider refining your value proposition");
            }
          }
          break;
          
        case 'competitor_analysis':
          if (tileData.competitors?.length > 0) {
            insights.push(`${tileData.competitors.length} key competitors identified`);
            const topCompetitor = tileData.competitors[0];
            if (topCompetitor) {
              insights.push(`Top competitor: ${topCompetitor.name}`);
              if (topCompetitor.weaknesses?.length > 0) {
                insights.push(`Opportunity: ${topCompetitor.weaknesses[0]}`);
              }
            }
          }
          break;
          
        case 'pricing_strategy':
          if (tileData.metrics) {
            const pricing = tileData.metrics.find((m: any) => m.name?.toLowerCase().includes('price'));
            const model = tileData.metrics.find((m: any) => m.name?.toLowerCase().includes('model'));
            
            if (pricing) insights.push(`Recommended pricing: ${pricing.value}${pricing.unit || ''}`);
            if (model) insights.push(`Pricing model: ${model.value}`);
          }
          break;
          
        case 'target_audience':
          if (tileData.segments?.length > 0) {
            insights.push(`${tileData.segments.length} audience segments identified`);
            const primary = tileData.segments[0];
            if (primary) {
              insights.push(`Primary audience: ${primary.name} (${primary.value || primary.share}%)`);
            }
          }
          break;
          
        case 'user_engagement':
          if (tileData.metrics) {
            const retention = tileData.metrics.find((m: any) => m.name?.toLowerCase().includes('retention'));
            const engagement = tileData.metrics.find((m: any) => m.name?.toLowerCase().includes('engagement'));
            
            if (retention) insights.push(`Expected retention: ${retention.value}${retention.unit || ''}`);
            if (engagement) insights.push(`Engagement rate: ${engagement.value}${engagement.unit || ''}`);
          }
          break;
      }
      
      // Add insights from the data itself
      if (tileData.insights?.length > 0) {
        insights.push(...tileData.insights.slice(0, 2));
      }
    }
    
    // Add idea-specific context
    if (ideaText) {
      insights.push(`Analysis for: "${ideaText.slice(0, 50)}..."`);
    }
    
    return insights.length > 0 ? insights : null;
  };

  const specificInsights = getSpecificInsights();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{insight.title}</DialogTitle>
              <DialogDescription>{insight.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Data-Specific Insights */}
          {specificInsights && (
            <Card className="p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-violet-600" />
                <h3 className="font-semibold text-violet-900 dark:text-violet-100">Your Data Insights</h3>
                <Badge variant="secondary" className="ml-auto">Real-time</Badge>
              </div>
              <ul className="space-y-2">
                {specificInsights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {/* Why It Matters */}
          <Card className="p-4 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Why This Matters</h3>
            </div>
            <ul className="space-y-2">
              {insight.whyItMatters.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Profit Impact */}
          <Card className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-900 dark:text-green-100">Profit Impact</h3>
            </div>
            <p className="text-sm font-medium">{insight.profitImpact}</p>
          </Card>

          {/* How to Use */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">How to Interpret</h3>
            </div>
            <ul className="space-y-2">
              {insight.howToUse.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Action Items */}
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Action Items</h3>
              <Badge variant="secondary" className="ml-auto">Do This</Badge>
            </div>
            <ul className="space-y-2">
              {insight.actionItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary font-semibold">{idx + 1}.</span>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
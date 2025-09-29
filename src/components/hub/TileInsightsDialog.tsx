import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  TrendingUp, Target, DollarSign, Users, Lightbulb, 
  CheckCircle, AlertCircle, ArrowRight, BookOpen, MessageSquare
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
}

export function TileInsightsDialog({ open, onOpenChange, tileType }: TileInsightsDialogProps) {
  const insight = tileInsights[tileType] || tileInsights.market_trends;
  const Icon = insight.icon;

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
import React, { useState, useEffect } from 'react';
import { Building2, TrendingUp, Users, Shield, Brain, ChevronRight, ExternalLink, AlertCircle, Lightbulb, Target, Sparkles, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { CompetitionChatDialog } from './CompetitionChatDialog';

interface Competitor {
  name: string;
  marketShare: string;
  strength: 'strong' | 'moderate' | 'weak';
  strengths: string[];
  weaknesses: string[];
  funding: string;
  founded: string;
  url?: string;
}

interface CompetitionData {
  competitors: Competitor[];
  marketConcentration: string;
  entryBarriers: string;
  differentiationOpportunities: string[];
  competitiveLandscape: {
    directCompetitors: number;
    indirectCompetitors: number;
    substitutes: number;
  };
  analysis: {
    threat: 'high' | 'medium' | 'low';
    opportunities: string[];
    recommendations: string[];
  };
}

interface EnhancedCompetitionTileProps {
  idea?: string;
}

export function EnhancedCompetitionTile({ idea }: EnhancedCompetitionTileProps) {
  const [data, setData] = useState<CompetitionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const { toast } = useToast();

  // Load mock data on mount
  useEffect(() => {
    const loadMockData = async () => {
      setLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockData: CompetitionData = {
        competitors: [
          {
            name: "TechCorp Solutions",
            marketShare: "32%",
            strength: "strong",
            strengths: ["Brand recognition", "Enterprise clients", "Global presence"],
            weaknesses: ["High pricing", "Slow innovation", "Complex UI"],
            funding: "$450M Series E",
            founded: "2015",
            url: "https://techcorp.example"
          },
          {
            name: "InnovateLabs",
            marketShare: "18%",
            strength: "moderate",
            strengths: ["Fast innovation", "Modern tech stack", "Good UX"],
            weaknesses: ["Limited scale", "Small team", "Few enterprise features"],
            funding: "$85M Series C",
            founded: "2018",
            url: "https://innovatelabs.example"
          },
          {
            name: "QuickStart AI",
            marketShare: "15%",
            strength: "moderate",
            strengths: ["AI-first approach", "Competitive pricing", "Easy onboarding"],
            weaknesses: ["Limited features", "New to market", "Small customer base"],
            funding: "$35M Series B",
            founded: "2020",
            url: "https://quickstart.example"
          },
          {
            name: "Legacy Systems Inc",
            marketShare: "22%",
            strength: "weak",
            strengths: ["Established customer base", "Industry experience", "Reliable"],
            weaknesses: ["Outdated technology", "Poor mobile experience", "High churn"],
            funding: "$200M (2010)",
            founded: "2005"
          },
          {
            name: "Nimble Startup",
            marketShare: "8%",
            strength: "weak",
            strengths: ["Agile development", "Niche focus", "Responsive support"],
            weaknesses: ["Limited resources", "Unproven model", "Geographic limitations"],
            funding: "$5M Seed",
            founded: "2022"
          }
        ],
        marketConcentration: "Moderate (HHI: 2,150)",
        entryBarriers: "Medium - Requires technical expertise and initial capital",
        differentiationOpportunities: [
          "AI-powered automation features",
          "Superior user experience design",
          "Vertical market specialization",
          "Competitive pricing models",
          "Better integration ecosystem"
        ],
        competitiveLandscape: {
          directCompetitors: 12,
          indirectCompetitors: 25,
          substitutes: 8
        },
        analysis: {
          threat: "medium",
          opportunities: [
            "Market fragmentation allows new entrants",
            "Customer dissatisfaction with legacy providers",
            "Growing demand exceeds current supply",
            "Technology shifts creating new niches"
          ],
          recommendations: [
            "Focus on underserved SMB segment",
            "Differentiate through superior UX",
            "Build strategic partnerships early",
            "Leverage AI for competitive advantage"
          ]
        }
      };
      
      setData(mockData);
      setLoading(false);
    };
    
    loadMockData();
  }, []);

  const runAIAnalysis = async () => {
    setAiLoading(true);
    
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let mockAnalysis = '';
      
      switch(analysisType) {
        case 'competitive-positioning':
          mockAnalysis = `## Competitive Positioning Analysis

### Market Position
Your startup would enter a moderately concentrated market with clear opportunities for differentiation. The current market leader (TechCorp Solutions) holds 32% market share but shows vulnerabilities in innovation speed and user experience.

### Strategic Positioning Options

**1. Disruptor Strategy**
- Target the 68% of market not dominated by the leader
- Focus on SMB segment underserved by enterprise-focused competitors
- Leverage modern technology stack for faster feature development
- Price 30-40% below TechCorp while maintaining margins through efficiency

**2. Niche Dominator**
- Identify vertical markets ignored by generalists
- Build deep domain expertise in 1-2 specific industries
- Command premium pricing through specialization
- Aim for 50%+ market share in chosen niches

**3. Innovation Leader**
- Outpace competitors with AI/ML capabilities
- Release features 2x faster than market average
- Build community-driven development approach
- Position as the "next-generation" solution

### Competitive Advantages to Build
1. **Technology Moat**: Leverage cutting-edge AI that competitors can't easily replicate
2. **Network Effects**: Create platform dynamics that strengthen with each user
3. **Brand Positioning**: Establish as the modern, user-friendly alternative
4. **Partnership Ecosystem**: Build integrations competitors lack

### Key Success Factors
- Move fast in first 18 months to establish position
- Focus relentlessly on customer success metrics
- Build defensible advantages before competitors react
- Maintain 40%+ gross margins for sustainable growth`;
          break;
          
        case 'weakness-exploitation':
          mockAnalysis = `## Competitor Weakness Exploitation Strategy

### Critical Weaknesses Identified

**TechCorp Solutions (32% share)**
- **Weakness**: Slow 6-month release cycles
- **Exploit**: Ship weekly updates, emphasize agility
- **Weakness**: Complex enterprise UI
- **Exploit**: Build intuitive self-serve experience
- **Weakness**: High pricing ($500-2000/mo)
- **Exploit**: Offer transparent, value-based pricing

**InnovateLabs (18% share)**
- **Weakness**: Limited enterprise features
- **Exploit**: Build enterprise-ready from day one
- **Weakness**: Small support team
- **Exploit**: Offer 24/7 automated + human support
- **Weakness**: Geographic limitations
- **Exploit**: Go global from launch

**Legacy Systems Inc (22% share)**
- **Weakness**: 45% annual churn rate
- **Exploit**: Target their dissatisfied customers
- **Weakness**: No mobile app
- **Exploit**: Mobile-first approach
- **Weakness**: Outdated tech stack
- **Exploit**: Highlight modern architecture benefits

### Tactical Exploitation Plan

**Phase 1 (Months 1-3): Intelligence Gathering**
- Monitor competitor customer complaints
- Analyze feature gaps through user research
- Track competitor pricing changes
- Identify unhappy customer segments

**Phase 2 (Months 4-6): Targeted Attack**
- Launch comparison pages highlighting advantages
- Create migration tools from competitor platforms
- Offer switching incentives (free migration, discounts)
- Deploy targeted ads to competitor keywords

**Phase 3 (Months 7-12): Market Share Capture**
- Case studies from switched customers
- Aggressive content marketing on competitor weaknesses
- Partner with consultants serving their customers
- Build features specifically requested by their users

### Expected Impact
- Capture 5-8% market share in Year 1
- 60% of new customers from competitor switching
- 2.5x lower CAC through targeted acquisition
- 85% win rate in competitive deals`;
          break;
          
        case 'differentiation-strategy':
          mockAnalysis = `## Differentiation Strategy Framework

### Unique Value Proposition Development

**Current Market Gaps**
1. No true AI-native solution (only AI add-ons)
2. Lack of industry-specific solutions
3. Poor integration between related tools
4. Complex pricing requiring sales calls
5. Limited self-service capabilities

### Recommended Differentiation Vectors

**Primary Differentiator: AI-First Architecture**
- Not just AI features, but AI at the core
- 10x faster insights than traditional tools
- Predictive capabilities competitors lack
- Natural language interface throughout
- *Impact*: 70% reduction in time-to-value

**Secondary Differentiator: Radical Simplicity**
- One-click setup (vs. weeks of implementation)
- No training required interface
- Transparent, self-serve pricing
- Instant value without customization
- *Impact*: 90% lower onboarding costs

**Tertiary Differentiator: Community-Driven**
- Open-source core components
- User-requested features shipped weekly
- Transparent roadmap and development
- Revenue sharing with contributors
- *Impact*: 3x faster product development

### Implementation Roadmap

**Quarter 1: Foundation**
- Define core differentiators clearly
- Build MVP showcasing unique value
- Create compelling demos/comparisons
- Establish brand identity around differentiation

**Quarter 2: Market Entry**
- Launch with clear positioning
- Target early adopters who value differentiation
- Gather proof points and case studies
- Refine message based on market response

**Quarter 3: Amplification**
- Scale marketing around proven differentiators
- Build partnership ecosystem
- Expand feature set maintaining differentiation
- Establish thought leadership

**Quarter 4: Defensibility**
- File patents on unique approaches
- Build network effects
- Create switching costs
- Establish market category leadership

### Measurement Framework
- Differentiation Score: Customer surveys on uniqueness
- Win Rate: % of competitive deals won
- Premium Ability: Price premium vs. alternatives
- Word of Mouth: % of organic acquisition
- Retention Delta: Churn rate vs. industry average`;
          break;
          
        case 'partnership-opportunities':
          mockAnalysis = `## Strategic Partnership Opportunities

### High-Value Partnership Targets

**Technology Partners**

1. **Cloud Infrastructure Providers**
   - *Target*: AWS, Google Cloud, Azure
   - *Value*: Co-marketing, credits, technical support
   - *Approach*: Join startup programs, build marketplace apps
   - *Potential*: $500K+ in credits, 1000+ customer referrals

2. **Complementary SaaS Tools**
   - *Targets*: Slack, Salesforce, HubSpot, Zapier
   - *Value*: Integration visibility, customer access
   - *Approach*: Build deep integrations, co-market
   - *Potential*: Access to 10M+ potential users

3. **AI/ML Platforms**
   - *Targets*: OpenAI, Anthropic, Hugging Face
   - *Value*: Advanced capabilities, credibility
   - *Approach*: Become showcase partner
   - *Potential*: Technical advantages competitors can't match

**Channel Partners**

1. **Systems Integrators**
   - *Targets*: Accenture, Deloitte, PwC
   - *Value*: Enterprise customer access
   - *Approach*: Enable their consultants, revenue share
   - *Potential*: $10M+ annual revenue opportunity

2. **Resellers & Distributors**
   - *Targets*: Regional tech distributors
   - *Value*: Geographic expansion
   - *Approach*: White-label options, margin structure
   - *Potential*: 40% of revenue through channels

3. **Industry Consultants**
   - *Targets*: Boutique firms in target verticals
   - *Value*: Domain expertise, warm introductions
   - *Approach*: Certification program, referral fees
   - *Potential*: 25% of enterprise deals

**Strategic Alliances**

1. **Non-Competing Competitors**
   - *Targets*: Players in adjacent markets
   - *Value*: Market intelligence, customer sharing
   - *Approach*: Formal partnership agreements
   - *Potential*: Expand TAM by 30%

2. **Industry Associations**
   - *Targets*: Trade groups, standards bodies
   - *Value*: Credibility, member access
   - *Approach*: Sponsor, contribute, lead initiatives
   - *Potential*: Industry standard status

### Partnership Execution Plan

**Phase 1 (Months 1-2): Foundation**
- Develop partnership strategy and criteria
- Create partner program materials
- Build integration framework
- Assign dedicated partnership resource

**Phase 2 (Months 3-4): Initial Outreach**
- Identify and prioritize top 20 targets
- Initiate conversations with warm intros
- Develop 3-5 pilot partnerships
- Create initial integration/collaborations

**Phase 3 (Months 5-6): Program Launch**
- Formalize partner program structure
- Launch partner portal and resources
- Announce initial partnerships publicly
- Begin generating partner-sourced revenue

**Phase 4 (Months 7-12): Scale**
- Expand to 50+ active partnerships
- Optimize partner experience and tools
- Develop tiered partner benefits
- Target 30% of revenue from partners

### Success Metrics
- Partner-sourced pipeline: $5M+ in Year 1
- Partner-influenced deals: 40% of total
- Integration activations: 10,000+
- Partner NPS: 50+
- Revenue per partner: $100K+ annually`;
          break;
          
        default:
          mockAnalysis = customPrompt ? 
            `## Custom Analysis\n\n${customPrompt}\n\n### Analysis Results\n\nBased on your specific query about "${customPrompt}", here's a comprehensive analysis...\n\n[Mock analysis based on custom prompt would appear here]` :
            'Please provide a custom prompt for analysis.';
      }
      
      setAiAnalysis(mockAnalysis);
      toast({
        title: "Analysis Complete",
        description: "AI competitive analysis has been generated",
        duration: 3000
      });
      
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: "Failed to generate analysis. Please try again.",
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setAiLoading(false);
    }
  };

  const getAnalysisTypeIcon = (type: string) => {
    switch(type) {
      case 'competitive-positioning': return Target;
      case 'weakness-exploitation': return Shield;
      case 'differentiation-strategy': return Sparkles;
      case 'partnership-opportunities': return Users;
      case 'custom': return MessageSquare;
      default: return Brain;
    }
  };

  const getStrengthColor = (strength: string) => {
    switch(strength) {
      case 'strong': return 'text-red-500';
      case 'moderate': return 'text-yellow-500';
      case 'weak': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const getThreatBadgeVariant = (threat: string) => {
    switch(threat) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Competition Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Competition Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {error || 'No competition data available'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Competition Analysis
            </CardTitle>
            <CardDescription>
              {data.competitors.length} competitors analyzed • {data.competitiveLandscape.directCompetitors} direct threats
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={getThreatBadgeVariant(data.analysis.threat)}>
              {data.analysis.threat.toUpperCase()} THREAT
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setChatDialogOpen(true)}
            >
              <Brain className="h-4 w-4" />
              AI Analysis
            </Button>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>AI Competitive Analysis</DialogTitle>
                  <DialogDescription>
                    Generate strategic insights about the competitive landscape
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Analysis Type</label>
                    <Select value={analysisType} onValueChange={setAnalysisType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="competitive-positioning">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Competitive Positioning Strategy
                          </div>
                        </SelectItem>
                        <SelectItem value="weakness-exploitation">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Weakness Exploitation Tactics
                          </div>
                        </SelectItem>
                        <SelectItem value="differentiation-strategy">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Differentiation Opportunities
                          </div>
                        </SelectItem>
                        <SelectItem value="partnership-opportunities">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Partnership & Alliance Strategy
                          </div>
                        </SelectItem>
                        <SelectItem value="custom">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Custom Analysis
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {analysisType === 'custom' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Custom Prompt</label>
                      <Textarea 
                        placeholder="Enter your specific analysis request..."
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}

                  <Button 
                    onClick={runAIAnalysis} 
                    disabled={aiLoading || (analysisType === 'custom' && !customPrompt)}
                    className="w-full"
                  >
                    {aiLoading ? (
                      <>Analyzing...</>
                    ) : (
                      <>
                        {React.createElement(getAnalysisTypeIcon(analysisType), { className: "h-4 w-4 mr-2" })}
                        Generate Analysis
                      </>
                    )}
                  </Button>

                  {aiAnalysis && (
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {aiAnalysis.split('\n').map((line, i) => {
                          if (line.startsWith('##')) {
                            return <h2 key={i} className="text-lg font-semibold mt-4 mb-2">{line.replace('##', '').trim()}</h2>;
                          } else if (line.startsWith('###')) {
                            return <h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.replace('###', '').trim()}</h3>;
                          } else if (line.startsWith('**') && line.endsWith('**')) {
                            return <p key={i} className="font-semibold">{line.replace(/\*\*/g, '')}</p>;
                          } else if (line.startsWith('-')) {
                            return <li key={i} className="ml-4">{line.substring(1).trim()}</li>;
                          } else if (line.startsWith('*')) {
                            return <li key={i} className="ml-4">{line.substring(1).trim()}</li>;
                          } else if (line.trim()) {
                            return <p key={i} className="mb-2">{line}</p>;
                          }
                          return null;
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs defaultValue="overview" className="h-full">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Market Concentration</p>
                <p className="text-lg font-semibold">{data.marketConcentration}</p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Entry Barriers</p>
                <p className="text-lg font-semibold">{data.entryBarriers}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Competitive Landscape</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-accent">{data.competitiveLandscape.directCompetitors}</p>
                  <p className="text-sm text-muted-foreground mt-1">Direct Competitors</p>
                </div>
                <div className="bg-muted/50 border border-border/50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold">{data.competitiveLandscape.indirectCompetitors}</p>
                  <p className="text-sm text-muted-foreground mt-1">Indirect</p>
                </div>
                <div className="bg-muted/50 border border-border/50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold">{data.competitiveLandscape.substitutes}</p>
                  <p className="text-sm text-muted-foreground mt-1">Substitutes</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Market Share Distribution</p>
              <div className="space-y-3 bg-muted/20 rounded-lg p-4">
                {data.competitors.slice(0, 3).map((comp, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-36 truncate">{comp.name}</span>
                    <Progress value={parseInt(comp.marketShare)} className="flex-1 h-2" />
                    <span className="text-sm font-semibold w-12 text-right">{comp.marketShare}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                  <span className="text-sm font-medium w-36">Others</span>
                  <Progress value={13} className="flex-1 h-2" />
                  <span className="text-sm font-semibold w-12 text-right">13%</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="competitors" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {data.competitors.map((comp, idx) => (
                  <div 
                    key={idx} 
                    className="border border-border/50 rounded-lg p-4 hover:bg-accent/5 hover:border-accent/30 cursor-pointer transition-all duration-200"
                    onClick={() => setSelectedCompetitor(comp)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-base">{comp.name}</p>
                          <Badge 
                            variant="outline" 
                            className={`${getStrengthColor(comp.strength)} border-current`}
                          >
                            {comp.strength.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Founded {comp.founded} • {comp.funding}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-primary">{comp.marketShare}</p>
                        <p className="text-xs text-muted-foreground">market share</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-green-500/5 rounded-md p-2">
                        <p className="font-medium text-green-600 dark:text-green-400 text-xs mb-1">Strengths:</p>
                        <p className="text-sm line-clamp-2">{comp.strengths.join(', ')}</p>
                      </div>
                      <div className="bg-red-500/5 rounded-md p-2">
                        <p className="font-medium text-red-600 dark:text-red-400 text-xs mb-1">Weaknesses:</p>
                        <p className="text-sm line-clamp-2">{comp.weaknesses.join(', ')}</p>
                      </div>
                    </div>

                    {comp.url && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-3 h-7 text-xs gap-1.5 w-full justify-center" 
                        asChild
                      >
                        <a 
                          href={comp.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Website <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="opportunities" className="mt-4">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-3">Market Opportunities</p>
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                  <div className="space-y-3">
                    {data.analysis.opportunities.map((opp, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <ChevronRight className="h-4 w-4 text-accent" />
                        </div>
                        <p className="text-sm flex-1">{opp}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Differentiation Vectors</p>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {data.differentiationOpportunities.map((diff, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary"
                        className="px-3 py-1.5"
                      >
                        {diff}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="strategy" className="mt-4">
            <div className="space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold mb-3">Strategic Recommendations</p>
                    <div className="space-y-2">
                      {data.analysis.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-sm font-medium text-primary min-w-[20px]">
                            {idx + 1}.
                          </span>
                          <p className="text-sm text-muted-foreground flex-1">
                            {rec}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                  <Target className="h-4 w-4" />
                  <span>View Positioning Map</span>
                </Button>
                <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                  <TrendingUp className="h-4 w-4" />
                  <span>Growth Projections</span>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Competitor Detail Dialog */}
        <Dialog open={!!selectedCompetitor} onOpenChange={() => setSelectedCompetitor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedCompetitor?.name}</DialogTitle>
              <DialogDescription>
                Detailed competitive analysis
              </DialogDescription>
            </DialogHeader>
            {selectedCompetitor && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Market Share</p>
                    <p className="text-lg font-semibold">{selectedCompetitor.marketShare}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Funding</p>
                    <p className="text-lg font-semibold">{selectedCompetitor.funding}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Strengths</p>
                  <ul className="space-y-1">
                    {selectedCompetitor.strengths.map((str, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400" />
                        {str}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Weaknesses</p>
                  <ul className="space-y-1">
                    {selectedCompetitor.weaknesses.map((weak, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400" />
                        {weak}
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedCompetitor.url && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={selectedCompetitor.url} target="_blank" rel="noopener noreferrer">
                      Visit Website <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
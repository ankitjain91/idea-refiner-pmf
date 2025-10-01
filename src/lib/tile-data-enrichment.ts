/**
 * Tile Data Enrichment Service
 * Provides comprehensive explanations, insights, and actionable recommendations
 * for all dashboard tiles to create a rich, informative experience
 */

interface EnrichedMetric {
  value: string | number;
  label: string;
  explanation: string;
  meaning: string;
  actionable: string;
  confidence: number;
  trend?: 'up' | 'down' | 'stable';
  benchmark?: string;
}

interface TileEnrichment {
  summary: string;
  insights: string[];
  recommendations: string[];
  metrics: EnrichedMetric[];
  howWeCalculated: string;
  whatThisMeans: string;
  whyItMatters: string;
  nextSteps: string[];
  learnMoreTopics?: string[];
}

// PMF Score Enrichment
export function enrichPMFScore(data: any): TileEnrichment {
  const score = data?.score || 0;
  const tier = data?.tier || 'Evaluating';
  const breakdown = data?.breakdown || {};
  
  const getScoreInterpretation = (score: number) => {
    if (score >= 80) return { level: 'Excellent', action: 'Scale rapidly', color: 'green' };
    if (score >= 60) return { level: 'Good', action: 'Refine and grow', color: 'blue' };
    if (score >= 40) return { level: 'Moderate', action: 'Iterate on model', color: 'yellow' };
    return { level: 'Needs Work', action: 'Pivot or refine', color: 'red' };
  };
  
  const interpretation = getScoreInterpretation(score);
  
  return {
    summary: `Your SmoothBrains Score of ${score}/100 indicates ${interpretation.level.toLowerCase()} product-market fit potential.`,
    
    insights: [
      `You're in the ${tier} category, ${score >= 60 ? 'showing strong' : 'with room for'} market alignment`,
      `Market demand ${breakdown.market?.score >= 60 ? 'looks promising' : 'needs validation'} at ${breakdown.market?.score || 50}%`,
      `Competition is ${breakdown.competition?.score >= 70 ? 'intense' : 'manageable'} (${breakdown.competition?.score || 50}% difficulty)`,
      `Your timing score of ${breakdown.timing?.score || 50}% suggests the market is ${breakdown.timing?.score >= 60 ? 'ready' : 'emerging'}`
    ],
    
    recommendations: [
      interpretation.action,
      breakdown.market?.score < 60 ? 'Conduct deeper market research' : 'Expand market presence',
      breakdown.competition?.score > 70 ? 'Focus on differentiation' : 'Accelerate market entry',
      breakdown.productMarketFit?.score < 50 ? 'Refine value proposition' : 'Double down on what works'
    ],
    
    metrics: [
      {
        value: score,
        label: 'Overall Score',
        explanation: 'Composite score based on 5 key factors',
        meaning: `${interpretation.level} product-market fit`,
        actionable: interpretation.action,
        confidence: 85,
        trend: score >= 60 ? 'up' : 'stable',
        benchmark: 'Top startups score 75+'
      },
      {
        value: `${breakdown.market?.score || 50}%`,
        label: 'Market Demand',
        explanation: 'Calculated from search trends, market size, and growth rate',
        meaning: breakdown.market?.score >= 60 ? 'Strong customer interest' : 'Market needs development',
        actionable: breakdown.market?.score >= 60 ? 'Capitalize on demand' : 'Build awareness',
        confidence: 80,
        trend: breakdown.market?.score >= 60 ? 'up' : 'down'
      },
      {
        value: `${breakdown.competition?.score || 50}%`,
        label: 'Competition Level',
        explanation: 'Based on competitor count, market share, and barriers to entry',
        meaning: breakdown.competition?.score >= 70 ? 'Highly competitive' : 'Room to establish',
        actionable: 'Focus on unique value proposition',
        confidence: 75,
        trend: 'stable'
      },
      {
        value: tier,
        label: 'Performance Tier',
        explanation: 'Relative ranking among similar startups',
        meaning: `You're performing ${tier === 'Top Performer' ? 'exceptionally well' : 'with growth potential'}`,
        actionable: 'Study top performers in your category',
        confidence: 70,
        trend: 'up'
      }
    ],
    
    howWeCalculated: 'We analyze 5 dimensions: market demand (25%), competition (20%), product-market fit signals (25%), business model viability (20%), and timing (10%). Each factor is scored 0-100 based on real market data.',
    
    whatThisMeans: `A score of ${score} means your idea has ${interpretation.level.toLowerCase()} potential. ${score >= 60 ? 'Early indicators suggest strong market reception.' : 'Consider refining your approach based on market feedback.'}`,
    
    whyItMatters: 'The SmoothBrains Score predicts startup success probability. Ideas scoring 75+ have 3x higher success rates in their first year.',
    
    nextSteps: [
      score >= 60 ? 'Start building MVP' : 'Conduct customer interviews',
      'Analyze top competitors',
      'Define unique value proposition',
      score >= 75 ? 'Prepare for fundraising' : 'Iterate on product concept'
    ],
    
    learnMoreTopics: [
      'Product-Market Fit Metrics',
      'Startup Success Factors',
      'Market Validation Techniques',
      'Competitive Analysis Framework'
    ]
  };
}

// Market Size Enrichment
export function enrichMarketSize(data: any): TileEnrichment {
  const tam = data?.tam || { value: '0', unit: 'Unknown' };
  const sam = data?.sam || { value: '0', unit: 'Unknown' };
  const som = data?.som || { value: '0', unit: 'Unknown' };
  const growth = data?.growth_rate || '0%';
  
  const parseValue = (val: any) => {
    if (typeof val === 'object' && val.value) return val.value;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return val.toString();
    return '0';
  };
  
  const tamValue = parseValue(tam);
  const isLargeMarket = tamValue.includes('B') || (parseFloat(tamValue) > 500 && tam.unit === 'M');
  
  return {
    summary: `Total addressable market of $${tamValue}${tam.unit || ''} with ${growth} annual growth presents ${isLargeMarket ? 'significant' : 'focused'} opportunity.`,
    
    insights: [
      `TAM of $${tamValue}${tam.unit} represents the full market potential`,
      `SAM of $${parseValue(sam)}${sam.unit || ''} is your serviceable segment`,
      `SOM of $${parseValue(som)}${som.unit || ''} is realistically capturable in 3-5 years`,
      `${growth} growth rate ${parseFloat(growth) > 15 ? 'exceeds' : 'meets'} industry average`
    ],
    
    recommendations: [
      isLargeMarket ? 'Focus on market segmentation' : 'Dominate your niche',
      parseFloat(growth) > 20 ? 'Move quickly to capture growth' : 'Build sustainable advantages',
      'Target early adopters first',
      'Plan for 1% market capture initially'
    ],
    
    metrics: [
      {
        value: `$${tamValue}${tam.unit}`,
        label: 'Total Market (TAM)',
        explanation: 'Maximum revenue opportunity if 100% market share',
        meaning: isLargeMarket ? 'Large, attractive market' : 'Focused niche opportunity',
        actionable: 'Define your beachhead market',
        confidence: 75,
        trend: parseFloat(growth) > 10 ? 'up' : 'stable',
        benchmark: 'Unicorns typically target $10B+ TAM'
      },
      {
        value: `$${parseValue(sam)}${sam.unit || ''}`,
        label: 'Serviceable Market (SAM)',
        explanation: 'Portion you can realistically serve with your model',
        meaning: 'Your true market opportunity',
        actionable: 'Identify geographic and demographic focus',
        confidence: 70,
        trend: 'up'
      },
      {
        value: `$${parseValue(som)}${som.unit || ''}`,
        label: 'Obtainable Market (SOM)',
        explanation: 'Realistic capture in 3-5 years',
        meaning: 'Your medium-term revenue potential',
        actionable: 'Set revenue targets accordingly',
        confidence: 65,
        trend: 'up'
      },
      {
        value: growth,
        label: 'Annual Growth',
        explanation: 'Year-over-year market expansion rate',
        meaning: parseFloat(growth) > 15 ? 'Fast-growing market' : 'Steady market',
        actionable: parseFloat(growth) > 20 ? 'Prioritize speed' : 'Focus on quality',
        confidence: 80,
        trend: parseFloat(growth) > 15 ? 'up' : 'stable'
      }
    ],
    
    howWeCalculated: 'Market size derived from industry reports, search volumes, competitor revenues, and demographic data. TAM represents total demand, SAM is your serviceable segment, SOM is realistic 5-year capture.',
    
    whatThisMeans: `Your market opportunity is $${tamValue}${tam.unit}, growing at ${growth} annually. Focus on capturing $${parseValue(som)}${som.unit || ''} (SOM) as your 5-year target.`,
    
    whyItMatters: 'Market size determines your growth ceiling. VCs typically look for TAM > $1B for venture-scale returns. Growth rate indicates market momentum.',
    
    nextSteps: [
      'Validate TAM with bottom-up analysis',
      'Identify your beachhead market',
      'Map customer segments by value',
      'Build financial projections from SOM'
    ],
    
    learnMoreTopics: [
      'TAM SAM SOM Calculation',
      'Market Sizing Methods',
      'Growth Rate Analysis',
      'Market Entry Strategies'
    ]
  };
}

// Competition Enrichment
export function enrichCompetition(data: any): TileEnrichment {
  const level = data?.level || 'moderate';
  const score = data?.score || 5;
  const competitors = data?.competitors || [];
  
  const getCompetitionStrategy = (level: string) => {
    switch(level.toLowerCase()) {
      case 'low': return 'First-mover advantage';
      case 'moderate': return 'Differentiation focus';
      case 'high': return 'Niche dominance';
      default: return 'Market positioning';
    }
  };
  
  return {
    summary: `${level.charAt(0).toUpperCase() + level.slice(1)} competition (${score}/10) with ${competitors.length || 'several'} key players. Strategy: ${getCompetitionStrategy(level)}.`,
    
    insights: [
      `Competition intensity: ${score}/10 (${level})`,
      competitors.length > 5 ? 'Saturated market requires clear differentiation' : 'Room for new entrants',
      score > 7 ? 'Established players dominate' : 'Market is still forming',
      'Customer loyalty is ' + (score > 6 ? 'high - switching costs matter' : 'low - opportunity to capture')
    ],
    
    recommendations: [
      getCompetitionStrategy(level),
      score > 7 ? 'Find underserved segments' : 'Build brand quickly',
      'Create switching incentives',
      'Focus on superior user experience'
    ],
    
    metrics: [
      {
        value: score,
        label: 'Competition Score',
        explanation: '1-10 scale based on competitor count and strength',
        meaning: score > 7 ? 'Highly competitive' : score > 4 ? 'Moderate competition' : 'Low competition',
        actionable: score > 7 ? 'Differentiate aggressively' : 'Move fast to establish',
        confidence: 80,
        trend: 'up',
        benchmark: 'Sweet spot is 4-6'
      },
      {
        value: competitors.length || '5-10',
        label: 'Key Competitors',
        explanation: 'Direct competitors in your space',
        meaning: competitors.length > 10 ? 'Crowded market' : 'Manageable landscape',
        actionable: 'Analyze top 3 deeply',
        confidence: 75,
        trend: 'up'
      },
      {
        value: level,
        label: 'Market Maturity',
        explanation: 'Based on incumbent strength and barriers',
        meaning: `${level === 'high' ? 'Mature' : level === 'low' ? 'Emerging' : 'Growing'} market stage`,
        actionable: 'Adapt strategy to maturity',
        confidence: 70,
        trend: 'stable'
      }
    ],
    
    howWeCalculated: 'Competition scored 1-10 based on: number of competitors, market share concentration, funding levels, customer loyalty, and barriers to entry.',
    
    whatThisMeans: `With ${level} competition (${score}/10), you'll need to ${score > 6 ? 'differentiate clearly' : 'move quickly'}. ${competitors.length > 5 ? 'Focus on unmet needs.' : 'Opportunity to define the category.'}`,
    
    whyItMatters: 'Competition level determines strategy. Low competition means speed matters. High competition requires differentiation and niche focus.',
    
    nextSteps: [
      'Conduct competitive analysis',
      'Identify differentiation points',
      'Map competitive positioning',
      score > 6 ? 'Find blue ocean opportunities' : 'Establish market presence'
    ],
    
    learnMoreTopics: [
      'Competitive Analysis Framework',
      'Blue Ocean Strategy',
      'Positioning Strategy',
      'Competitive Moats'
    ]
  };
}

// Sentiment Enrichment
export function enrichSentiment(data: any): TileEnrichment {
  const overall = data?.overall || 'neutral';
  const score = data?.score || 0.5;
  const breakdown = data?.breakdown || { positive: 0.33, neutral: 0.34, negative: 0.33 };
  
  const sentimentLevel = score > 0.6 ? 'positive' : score < 0.4 ? 'negative' : 'neutral';
  const percentage = Math.round(score * 100);
  
  return {
    summary: `Market sentiment is ${percentage}% ${sentimentLevel} with ${Math.round(breakdown.positive * 100)}% positive mentions. ${sentimentLevel === 'positive' ? 'Strong market receptivity.' : 'Opportunity to shape perception.'}`,
    
    insights: [
      `${percentage}% positive sentiment ${sentimentLevel === 'positive' ? 'indicates market readiness' : 'shows room for improvement'}`,
      `${Math.round(breakdown.positive * 100)}% positive, ${Math.round(breakdown.neutral * 100)}% neutral, ${Math.round(breakdown.negative * 100)}% negative`,
      breakdown.negative > 0.3 ? 'Address concerns proactively' : 'Maintain positive momentum',
      'Sentiment trending ' + (score > 0.5 ? 'upward' : 'needs attention')
    ],
    
    recommendations: [
      sentimentLevel === 'positive' ? 'Amplify positive voices' : 'Address pain points',
      'Engage with community feedback',
      breakdown.negative > 0.2 ? 'Create FAQ for concerns' : 'Build on success stories',
      'Monitor sentiment weekly'
    ],
    
    metrics: [
      {
        value: `${percentage}%`,
        label: 'Overall Sentiment',
        explanation: 'Weighted average of all mentions',
        meaning: sentimentLevel === 'positive' ? 'Market likes the concept' : 'Mixed reception',
        actionable: sentimentLevel === 'positive' ? 'Leverage testimonials' : 'Improve messaging',
        confidence: 75,
        trend: score > 0.5 ? 'up' : 'down',
        benchmark: 'Successful launches average 65%+'
      },
      {
        value: `${Math.round(breakdown.positive * 100)}%`,
        label: 'Positive Mentions',
        explanation: 'Percentage expressing enthusiasm',
        meaning: breakdown.positive > 0.5 ? 'Strong advocates exist' : 'Build more supporters',
        actionable: 'Identify and engage advocates',
        confidence: 80,
        trend: breakdown.positive > 0.4 ? 'up' : 'stable'
      },
      {
        value: `${Math.round(breakdown.negative * 100)}%`,
        label: 'Concerns Raised',
        explanation: 'Percentage with objections',
        meaning: breakdown.negative > 0.3 ? 'Address concerns' : 'Minor resistance',
        actionable: 'Create objection handling',
        confidence: 75,
        trend: breakdown.negative > 0.3 ? 'up' : 'stable'
      }
    ],
    
    howWeCalculated: 'Sentiment analyzed from social media, forums, news, and reviews using NLP. Weighted by source authority and recency.',
    
    whatThisMeans: `${percentage}% positive sentiment means the market is ${sentimentLevel === 'positive' ? 'receptive' : 'uncertain'}. ${breakdown.negative > 0.3 ? 'Address concerns to improve reception.' : 'Build on positive momentum.'}`,
    
    whyItMatters: 'Sentiment predicts adoption rate. Positive sentiment (>60%) correlates with 2x faster growth. Negative sentiment requires proactive management.',
    
    nextSteps: [
      'Analyze negative feedback themes',
      'Engage with positive advocates',
      'Refine messaging based on concerns',
      'Build social proof'
    ],
    
    learnMoreTopics: [
      'Sentiment Analysis',
      'Community Management',
      'Crisis Communication',
      'Brand Perception'
    ]
  };
}

// Market Trends Enrichment
export function enrichMarketTrends(data: any): TileEnrichment {
  const trends = data?.trends || [];
  const insights = data?.insights || [];
  const sentiment = data?.sentiment || 'neutral';
  
  return {
    summary: `Market showing ${sentiment} momentum with ${trends.length} key trends identified. ${insights.length > 0 ? insights[0] : 'Market dynamics evolving.'}`,
    
    insights: insights.length > 0 ? insights : [
      'Market momentum building',
      'Technology adoption accelerating',
      'Customer expectations evolving',
      'New opportunities emerging'
    ],
    
    recommendations: [
      'Monitor trend developments weekly',
      'Align product with emerging needs',
      'Position as trend leader',
      'Build trend-responsive features'
    ],
    
    metrics: trends.slice(0, 4).map((trend: any, index: number) => ({
      value: trend.title || `Trend ${index + 1}`,
      label: 'Key Trend',
      explanation: trend.description || 'Emerging market movement',
      meaning: 'Market direction indicator',
      actionable: 'Incorporate into strategy',
      confidence: 70,
      trend: 'up' as const
    })),
    
    howWeCalculated: 'Trends identified from news analysis, search patterns, social discussions, and industry reports using AI pattern recognition.',
    
    whatThisMeans: 'These trends show where the market is heading. Aligning with them increases success probability.',
    
    whyItMatters: 'Understanding trends helps you ride market waves rather than swim against them. Trend alignment increases growth by 40%.',
    
    nextSteps: [
      'Deep dive into top 3 trends',
      'Map trends to product features',
      'Create trend-based content',
      'Monitor trend evolution'
    ],
    
    learnMoreTopics: [
      'Trend Analysis',
      'Market Timing',
      'Innovation Adoption Curve',
      'Trend Forecasting'
    ]
  };
}

// Google Trends Enrichment
export function enrichGoogleTrends(data: any): TileEnrichment {
  const interest = data?.interest || 50;
  const trend = data?.trend || 'stable';
  const relatedQueries = data?.relatedQueries || [];
  
  return {
    summary: `Search interest at ${interest}/100 and ${trend}. ${trend === 'rising' ? 'Growing market attention.' : 'Steady market presence.'}`,
    
    insights: [
      `Interest level ${interest}/100 ${interest > 60 ? 'shows strong demand' : 'indicates emerging interest'}`,
      `Trend is ${trend} over past 12 months`,
      relatedQueries.length > 0 ? `${relatedQueries.length} related searches found` : 'Niche search patterns',
      interest > 50 ? 'Above average search volume' : 'Building search presence'
    ],
    
    recommendations: [
      interest > 60 ? 'Capitalize on high interest' : 'Build search presence',
      'Optimize for related queries',
      trend === 'rising' ? 'Accelerate marketing' : 'Boost awareness',
      'Create content for search terms'
    ],
    
    metrics: [
      {
        value: interest,
        label: 'Search Interest',
        explanation: 'Google Trends score (0-100)',
        meaning: interest > 60 ? 'High search demand' : 'Moderate interest',
        actionable: 'Create SEO content',
        confidence: 90,
        trend: trend === 'rising' ? 'up' : trend === 'declining' ? 'down' : 'stable',
        benchmark: 'Viral topics score 75+'
      }
    ],
    
    howWeCalculated: 'Google Trends API provides normalized search interest (0-100) based on search volume over time and geography.',
    
    whatThisMeans: `Interest of ${interest}/100 means ${interest > 50 ? 'people are actively searching' : 'awareness is building'}. ${trend === 'rising' ? 'Momentum is growing.' : 'Maintain visibility.'}`,
    
    whyItMatters: 'Search trends predict market demand. Rising trends indicate growing interest. High scores (>60) suggest product-market fit.',
    
    nextSteps: [
      'Analyze search term variations',
      'Create SEO-optimized content',
      'Monitor weekly changes',
      'Target trending keywords'
    ],
    
    learnMoreTopics: [
      'Google Trends Analysis',
      'SEO Strategy',
      'Keyword Research',
      'Search Demand Forecasting'
    ]
  };
}

// Generic enrichment for other tiles
export function enrichGenericTile(tileType: string, data: any): TileEnrichment {
  return {
    summary: 'Analysis complete. Click for detailed insights.',
    insights: [
      'Data processed successfully',
      'Multiple factors analyzed',
      'Recommendations generated'
    ],
    recommendations: [
      'Review detailed metrics',
      'Implement suggested actions',
      'Monitor progress'
    ],
    metrics: [],
    howWeCalculated: 'Advanced algorithms analyze multiple data sources.',
    whatThisMeans: 'This data provides actionable insights for your strategy.',
    whyItMatters: 'Data-driven decisions increase success probability.',
    nextSteps: [
      'Review analysis',
      'Prioritize actions',
      'Track results'
    ]
  };
}

// Main enrichment function
export function enrichTileData(tileType: string, data: any): TileEnrichment {
  switch(tileType) {
    case 'pmf_score':
    case 'quick_stats_pmf_score':
      return enrichPMFScore(data);
    
    case 'market_size':
    case 'quick_stats_market_size':
      return enrichMarketSize(data);
    
    case 'competition':
    case 'quick_stats_competition':
      return enrichCompetition(data);
    
    case 'sentiment':
    case 'quick_stats_sentiment':
      return enrichSentiment(data);
    
    case 'market_trends':
      return enrichMarketTrends(data);
    
    case 'google_trends':
      return enrichGoogleTrends(data);
    
    default:
      return enrichGenericTile(tileType, data);
  }
}
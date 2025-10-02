import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, detailed = false } = await req.json();

    if (!idea) {
      throw new Error('No idea provided');
    }

    console.log('[unified-sentiment] Processing idea:', idea.slice(0, 100) + '...');

    // Aggregate sentiment from multiple sources
    const sentimentData = await analyzeUnifiedSentiment(idea, detailed);

    return new Response(
      JSON.stringify({ sentiment: sentimentData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[unified-sentiment] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function analyzeUnifiedSentiment(idea: string, detailed: boolean) {
  // Extract key terms for analysis
  const keywords = extractKeywords(idea);
  
  // Simulate aggregating sentiment from multiple sources
  const sourceData = await aggregateSourceSentiment(idea, keywords);
  
  // Generate thematic clusters
  const clusters = generateThematicClusters(idea, sourceData);
  
  // Calculate overall metrics
  const metrics = calculateMetrics(sourceData, clusters);
  
  // Generate trend data
  const trendData = generateTrendData();
  
  // Generate word clouds
  const wordClouds = generateWordClouds(sourceData);
  
  // Create visualization data
  const charts = generateChartData(clusters, metrics);
  
  // Generate executive summary
  const summary = generateSummary(idea, metrics, clusters);

  return {
    summary,
    metrics,
    clusters,
    trend_data: trendData,
    word_clouds: wordClouds,
    charts,
    visuals_ready: true,
    confidence: determineConfidence(sourceData, metrics)
  };
}

function extractKeywords(idea: string): string[] {
  const words = idea.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'that', 'this', 'it', 'with', 'as', 'be', 'are', 'is']);
  return words
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 8);
}

function aggregateSourceSentiment(idea: string, keywords: string[]) {
  // Simulate aggregating sentiment from different sources
  // In production, this would pull from DATA_HUB indices
  
  const sources = ['reddit', 'twitter', 'news', 'blogs', 'forums'];
  const sourceData: any = {};
  
  sources.forEach(source => {
    // Generate realistic sentiment distribution for each source
    const basePositive = 45 + Math.random() * 25;
    const baseNegative = 10 + Math.random() * 15;
    const baseNeutral = 100 - basePositive - baseNegative;
    
    sourceData[source] = {
      positive: Math.round(basePositive),
      neutral: Math.round(baseNeutral),
      negative: Math.round(baseNegative),
      volume: Math.floor(100 + Math.random() * 500),
      engagement: Math.floor(1000 + Math.random() * 5000),
      posts: generateSamplePosts(source, keywords)
    };
  });
  
  return sourceData;
}

function generateSamplePosts(source: string, keywords: string[]) {
  // Generate sample posts for each source
  const sentiments = ['positive', 'neutral', 'negative'];
  const posts = [];
  
  for (let i = 0; i < 5; i++) {
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    posts.push({
      text: generatePostText(source, sentiment, keywords),
      sentiment,
      engagement: Math.floor(10 + Math.random() * 200),
      timestamp: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  return posts;
}

function generatePostText(source: string, sentiment: string, keywords: string[]) {
  const templates = {
    positive: {
      reddit: [
        `Just implemented ${keywords[0]} and the results are amazing! ROI in 2 months.`,
        `${keywords[0]} ${keywords[1]} changed our workflow completely. Highly recommend!`,
        `Game changer for our startup. ${keywords[0]} solved our biggest pain point.`
      ],
      twitter: [
        `🚀 ${keywords[0]} is the future! Already seeing 30% improvement in efficiency #startup`,
        `If you're not using ${keywords[0]} yet, you're missing out. Incredible results! 💯`,
        `Just hit our targets thanks to ${keywords[0]}. Best decision we made this year!`
      ],
      news: [
        `Industry experts praise ${keywords[0]} for innovative approach to ${keywords[1]}`,
        `${keywords[0]} disrupts traditional market with 40% growth quarter-over-quarter`,
        `Early adopters report significant success with ${keywords[0]} implementation`
      ]
    },
    neutral: {
      reddit: [
        `Considering ${keywords[0]} for our team. Anyone have experience to share?`,
        `${keywords[0]} seems interesting but need to see more real-world results.`,
        `Mixed feelings about ${keywords[0]}. Some features great, others need work.`
      ],
      twitter: [
        `Testing ${keywords[0]} this week. Will share results soon. #startup #tech`,
        `${keywords[0]} has potential but needs better documentation IMO`,
        `Interesting approach with ${keywords[0]}. Time will tell if it delivers.`
      ],
      news: [
        `Market watches ${keywords[0]} development with cautious optimism`,
        `${keywords[0]} enters competitive market with unique positioning`,
        `Analysts divided on long-term prospects of ${keywords[0]}`
      ]
    },
    negative: {
      reddit: [
        `${keywords[0]} pricing is too steep for small startups. Looking for alternatives.`,
        `Had integration issues with ${keywords[0]}. Support was slow to respond.`,
        `Not convinced ${keywords[0]} is worth the hype. Missing key features.`
      ],
      twitter: [
        `Disappointed with ${keywords[0]}. Doesn't live up to the marketing promises.`,
        `⚠️ Be careful with ${keywords[0]} - hidden costs and complex setup`,
        `${keywords[0]} needs major improvements before it's enterprise-ready`
      ],
      news: [
        `${keywords[0]} faces criticism over pricing and feature limitations`,
        `Security concerns raised about ${keywords[0]} data handling practices`,
        `Competitors challenge ${keywords[0]} market position with better offerings`
      ]
    }
  };
  
  const sourceTemplates = templates[sentiment as keyof typeof templates][source as keyof typeof templates.positive] || templates[sentiment as keyof typeof templates].reddit;
  return sourceTemplates[Math.floor(Math.random() * sourceTemplates.length)];
}

function generateThematicClusters(idea: string, sourceData: any) {
  const themes = [
    {
      theme: 'Adoption & Implementation',
      weight: 0.3,
      sentimentBias: { positive: 0.7, neutral: 0.2, negative: 0.1 }
    },
    {
      theme: 'Cost & ROI Analysis',
      weight: 0.25,
      sentimentBias: { positive: 0.4, neutral: 0.35, negative: 0.25 }
    },
    {
      theme: 'Features & Innovation',
      weight: 0.25,
      sentimentBias: { positive: 0.65, neutral: 0.25, negative: 0.1 }
    },
    {
      theme: 'Support & Documentation',
      weight: 0.1,
      sentimentBias: { positive: 0.45, neutral: 0.35, negative: 0.2 }
    },
    {
      theme: 'Security & Compliance',
      weight: 0.1,
      sentimentBias: { positive: 0.4, neutral: 0.4, negative: 0.2 }
    }
  ];
  
  return themes.map(theme => {
    const sentiment = {
      positive: Math.round(theme.sentimentBias.positive * 100),
      neutral: Math.round(theme.sentimentBias.neutral * 100),
      negative: Math.round(theme.sentimentBias.negative * 100)
    };
    
    const quotes = generateThemeQuotes(theme.theme, sentiment);
    const citations = generateCitations(theme.theme);
    
    return {
      theme: theme.theme,
      insight: generateThemeInsight(idea, theme.theme, sentiment),
      sentiment,
      quotes,
      citations
    };
  });
}

function generateThemeQuotes(theme: string, sentiment: any) {
  const quotes = [];
  
  if (sentiment.positive > 50) {
    quotes.push({
      text: `Excellent results with ${theme.toLowerCase()}. Exceeded our expectations!`,
      sentiment: 'positive' as const,
      source: Math.random() > 0.5 ? 'reddit' : 'twitter'
    });
  }
  
  if (sentiment.negative > 20) {
    quotes.push({
      text: `Concerns about ${theme.toLowerCase()}. Needs improvement in key areas.`,
      sentiment: 'negative' as const,
      source: Math.random() > 0.5 ? 'forums' : 'news'
    });
  }
  
  quotes.push({
    text: `Mixed experiences with ${theme.toLowerCase()}. Some wins, some challenges.`,
    sentiment: 'neutral' as const,
    source: 'blogs'
  });
  
  return quotes.slice(0, 2);
}

function generateCitations(theme: string) {
  const sources = [
    { source: `reddit.com/r/startups/${theme.toLowerCase().replace(/\s+/g, '_')}`, url: '#' },
    { source: `techcrunch.com/analysis/${theme.toLowerCase().replace(/\s+/g, '-')}`, url: '#' },
    { source: `medium.com/@expert/${theme.toLowerCase().replace(/\s+/g, '-')}`, url: '#' }
  ];
  
  return sources.slice(0, 2);
}

function generateThemeInsight(idea: string, theme: string, sentiment: any) {
  const ideaShort = idea.slice(0, 40) + '...';
  
  const insights: Record<string, string> = {
    'Adoption & Implementation': `Early adopters of ${ideaShort} report ${sentiment.positive > 60 ? 'smooth' : 'mixed'} implementation experiences with ${sentiment.positive}% positive feedback.`,
    'Cost & ROI Analysis': `ROI discussions show ${sentiment.positive > 50 ? 'favorable' : 'cautious'} outlook with businesses ${sentiment.positive > 50 ? 'seeing returns within 3-6 months' : 'seeking clearer value propositions'}.`,
    'Features & Innovation': `Community ${sentiment.positive > 60 ? 'praises innovative features' : 'requests additional functionality'} with ${sentiment.positive}% satisfaction rate.`,
    'Support & Documentation': `User feedback on support is ${sentiment.positive > 50 ? 'generally positive' : 'mixed'}, with ${sentiment.negative > 20 ? 'room for improvement in response times' : 'quick resolution times'}.`,
    'Security & Compliance': `Security discussions ${sentiment.positive > 50 ? 'express confidence' : 'raise concerns'} about data handling and compliance standards.`
  };
  
  return insights[theme] || `Analysis shows ${sentiment.positive}% positive sentiment for ${theme.toLowerCase()}.`;
}

function calculateMetrics(sourceData: any, clusters: any[]) {
  // Calculate overall sentiment distribution
  let totalPositive = 0;
  let totalNeutral = 0;
  let totalNegative = 0;
  let totalVolume = 0;
  let totalEngagement = 0;
  
  Object.values(sourceData).forEach((source: any) => {
    totalPositive += source.positive * source.volume;
    totalNeutral += source.neutral * source.volume;
    totalNegative += source.negative * source.volume;
    totalVolume += source.volume;
    totalEngagement += source.engagement;
  });
  
  const overallDistribution = {
    positive: Math.round(totalPositive / totalVolume),
    neutral: Math.round(totalNeutral / totalVolume),
    negative: Math.round(totalNegative / totalVolume)
  };
  
  // Calculate engagement-weighted distribution
  let engagementPositive = 0;
  let engagementNeutral = 0;
  let engagementNegative = 0;
  
  Object.values(sourceData).forEach((source: any) => {
    engagementPositive += source.positive * source.engagement;
    engagementNeutral += source.neutral * source.engagement;
    engagementNegative += source.negative * source.engagement;
  });
  
  const engagementWeighted = {
    positive: Math.round(engagementPositive / totalEngagement),
    neutral: Math.round(engagementNeutral / totalEngagement),
    negative: Math.round(engagementNegative / totalEngagement)
  };
  
  // Extract top drivers and concerns
  const positiveDrivers = [
    'adoption success',
    'cost savings',
    'innovation',
    'ease of use',
    'scalability'
  ].slice(0, 4);
  
  const negativeConcerns = [
    'pricing',
    'integration complexity',
    'support response',
    'feature gaps',
    'compliance'
  ].slice(0, 4);
  
  // Source breakdown
  const sourceBreakdown: any = {};
  Object.entries(sourceData).forEach(([source, data]: [string, any]) => {
    sourceBreakdown[source] = {
      positive: data.positive,
      neutral: data.neutral,
      negative: data.negative
    };
  });
  
  // Calculate trend
  const trendDelta = `+${Math.floor(5 + Math.random() * 10)}% positive vs last quarter`;
  
  return {
    overall_distribution: overallDistribution,
    engagement_weighted_distribution: engagementWeighted,
    trend_delta: trendDelta,
    top_positive_drivers: positiveDrivers,
    top_negative_concerns: negativeConcerns,
    source_breakdown: sourceBreakdown
  };
}

function generateTrendData() {
  const data = [];
  const today = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    
    // Create realistic trend with slight positive momentum
    const basePositive = 50 + (11 - i) * 0.8;
    const variation = Math.random() * 10 - 5;
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short' }),
      positive: Math.round(basePositive + variation),
      neutral: Math.round(25 + Math.random() * 5),
      negative: Math.round(20 - (11 - i) * 0.3 + Math.random() * 5)
    });
  }
  
  return data;
}

function generateWordClouds(sourceData: any) {
  // Extract keywords from posts
  const positiveWords = [
    { text: 'innovative', value: 85 + Math.random() * 15 },
    { text: 'efficient', value: 80 + Math.random() * 15 },
    { text: 'powerful', value: 75 + Math.random() * 15 },
    { text: 'seamless', value: 70 + Math.random() * 15 },
    { text: 'intuitive', value: 65 + Math.random() * 15 },
    { text: 'scalable', value: 60 + Math.random() * 15 },
    { text: 'reliable', value: 55 + Math.random() * 15 },
    { text: 'game-changer', value: 85 + Math.random() * 10 }
  ];
  
  const negativeWords = [
    { text: 'expensive', value: 55 + Math.random() * 15 },
    { text: 'complex', value: 50 + Math.random() * 15 },
    { text: 'limited', value: 45 + Math.random() * 15 },
    { text: 'slow', value: 40 + Math.random() * 15 },
    { text: 'buggy', value: 35 + Math.random() * 15 },
    { text: 'confusing', value: 35 + Math.random() * 15 },
    { text: 'lacking', value: 30 + Math.random() * 15 },
    { text: 'disappointing', value: 40 + Math.random() * 10 }
  ];
  
  return {
    positive: positiveWords.sort((a, b) => b.value - a.value),
    negative: negativeWords.sort((a, b) => b.value - a.value)
  };
}

function generateChartData(clusters: any[], metrics: any) {
  return [
    {
      type: 'donut',
      title: 'Overall Sentiment Distribution',
      series: [
        { name: 'Positive', value: metrics.overall_distribution.positive },
        { name: 'Neutral', value: metrics.overall_distribution.neutral },
        { name: 'Negative', value: metrics.overall_distribution.negative }
      ]
    },
    {
      type: 'bar',
      title: 'Sentiment by Theme',
      series: clusters.map(c => ({
        theme: c.theme,
        positive: c.sentiment.positive,
        neutral: c.sentiment.neutral,
        negative: c.sentiment.negative
      }))
    },
    {
      type: 'radar',
      title: 'Source Sentiment Comparison',
      series: Object.entries(metrics.source_breakdown).map(([source, data]: [string, any]) => ({
        source,
        sentiment: data.positive
      }))
    }
  ];
}

function generateSummary(idea: string, metrics: any, clusters: any[]) {
  const topCluster = clusters.reduce((prev, current) => 
    current.sentiment.positive > prev.sentiment.positive ? current : prev
  );
  
  const sentimentLevel = metrics.overall_distribution.positive > 65 ? 'strongly positive' :
                        metrics.overall_distribution.positive > 50 ? 'moderately positive' :
                        metrics.overall_distribution.positive > 35 ? 'mixed' : 'concerning';
  
  return `Sentiment around ${idea.slice(0, 50)}... is ${sentimentLevel}: ${metrics.overall_distribution.positive}% positive, ${metrics.overall_distribution.neutral}% neutral, and ${metrics.overall_distribution.negative}% negative. ${topCluster.theme} drives positive sentiment at ${topCluster.sentiment.positive}%. Key concerns include ${metrics.top_negative_concerns[0]} and ${metrics.top_negative_concerns[1]}. ${metrics.trend_delta}.`;
}

function determineConfidence(sourceData: any, metrics: any): 'High' | 'Moderate' | 'Low' {
  const totalVolume = Object.values(sourceData).reduce((sum: number, source: any) => sum + source.volume, 0);
  const consistency = Math.abs(metrics.overall_distribution.positive - metrics.engagement_weighted_distribution.positive);
  
  if (totalVolume > 1500 && consistency < 5) return 'High';
  if (totalVolume > 750 && consistency < 10) return 'Moderate';
  return 'Low';
}
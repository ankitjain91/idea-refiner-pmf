import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea } = await req.json();
    
    if (!idea) {
      throw new Error('Idea is required');
    }

    console.log('[NEWS-ANALYSIS] Analyzing news for:', idea);

    // Return error - this function needs real news API integration
    return new Response(
      JSON.stringify({
        success: false,
        error: 'News analysis requires API integration (GDELT, Serper, etc.)',
        news_trends: [],
        total_articles: 0,
        overall_sentiment: null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[NEWS-ANALYSIS] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        news_trends: [],
        total_articles: 0,
        overall_sentiment: null
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateComprehensiveNewsTrends(idea: string) {
  const lowerIdea = idea.toLowerCase();
  const keywords = lowerIdea.split(' ').filter(w => w.length > 3);
  
  // Extract key themes from the idea
  const isAIRelated = /\b(ai|artificial intelligence|machine learning|automation|llm|gpt)\b/i.test(idea);
  const isContractRelated = /\b(contract|legal|agreement|compliance|regulation)\b/i.test(idea);
  const isReviewRelated = /\b(review|analysis|audit|assessment|evaluation)\b/i.test(idea);
  const isLegalTech = isContractRelated || /\b(legal|law|attorney|lawyer|litigation)\b/i.test(idea);
  const isSaaSRelated = /\b(saas|software|platform|tool|service)\b/i.test(idea);
  const isFinanceRelated = /\b(finance|financial|payment|banking|fintech)\b/i.test(idea);
  
  // Generate highly relevant trends based on the idea
  const allTrends = [];
  
  // Add contract/legal tech specific trends if relevant
  if (isContractRelated || isLegalTech) {
    allTrends.push({
      trend_id: 'ai_contract_automation',
      title: 'AI Contract Automation Market Expands Rapidly',
      summary: `AI-powered contract review and management platforms saw 180% growth this year, with the global contract lifecycle management market projected to reach $6.5B by 2026. Major enterprises are reducing contract review time by 70% through automation.`,
      metrics: {
        article_count: 387,
        growth_rate: '+180%',
        sentiment: { positive: 72, neutral: 20, negative: 8 },
        geo_distribution: { 'US': 220, 'EU': 110, 'Asia': 57 },
        influence_score: 92,
        recency_score: 96,
        timeline: generateDetailedTimeline(180)
      },
      entities: ['LegalTech', 'Contract AI', 'CLM', 'DocuSign', 'Ironclad', 'ThoughtRiver', 'Kira Systems'],
      citations: [
        { source: 'Legal Tech News', headline: 'AI Contract Review Platforms See Record Adoption', url: '#', date: '2024-09-29' },
        { source: 'Forbes', headline: 'How AI is Transforming Legal Contract Management', url: '#', date: '2024-09-26' },
        { source: 'Bloomberg Law', headline: 'Contract Automation Market Hits $6.5B Milestone', url: '#', date: '2024-09-23' }
      ]
    });

    allTrends.push({
      trend_id: 'legal_tech_investment',
      title: 'Legal Tech Startups Attract Record Funding',
      summary: `Legal technology startups raised $1.2B in Q3 2024, with AI-powered contract analysis tools leading the charge. 65% of law firms now using or piloting AI contract review solutions.`,
      metrics: {
        article_count: 245,
        growth_rate: '+125%',
        sentiment: { positive: 68, neutral: 24, negative: 8 },
        geo_distribution: { 'US': 145, 'EU': 70, 'Asia': 30 },
        influence_score: 85,
        recency_score: 91,
        timeline: generateDetailedTimeline(125)
      },
      entities: ['Legal AI', 'Contract Intelligence', 'Risk Assessment', 'Compliance Tech'],
      citations: [
        { source: 'VentureBeat', headline: 'Legal Tech Funding Reaches All-Time High', url: '#', date: '2024-09-28' },
        { source: 'TechCrunch', headline: 'Why VCs Are Betting Big on Legal AI', url: '#', date: '2024-09-24' }
      ]
    });
  }
  
  // Add AI-related trends if relevant
  if (isAIRelated) {
    allTrends.push({
      trend_id: 'ai_document_processing',
      title: 'AI Document Intelligence Reaches New Heights',
      summary: `Advanced AI models now process complex documents with 95% accuracy, extracting key clauses, identifying risks, and suggesting improvements. Enterprise adoption increased 200% year-over-year.`,
      metrics: {
        article_count: 312,
        growth_rate: '+200%',
        sentiment: { positive: 75, neutral: 18, negative: 7 },
        geo_distribution: { 'US': 180, 'EU': 90, 'Asia': 42 },
        influence_score: 88,
        recency_score: 93,
        timeline: generateDetailedTimeline(200)
      },
      entities: ['NLP', 'Document AI', 'GPT-4', 'Claude', 'OpenAI', 'Anthropic'],
      citations: [
        { source: 'MIT Technology Review', headline: 'AI Document Processing Achieves Human-Level Accuracy', url: '#', date: '2024-09-27' },
        { source: 'Wired', headline: 'The Rise of Intelligent Document Processing', url: '#', date: '2024-09-25' }
      ]
    });
  }

  // Add review/analysis specific trends
  if (isReviewRelated || isAIRelated) {
    allTrends.push({
      trend_id: 'automated_risk_detection',
      title: 'Automated Risk Detection Becomes Industry Standard',
      summary: `AI-powered risk assessment tools now identify potential issues 10x faster than manual review. Companies using automated risk detection report 45% fewer contract disputes.`,
      metrics: {
        article_count: 198,
        growth_rate: '+145%',
        sentiment: { positive: 70, neutral: 22, negative: 8 },
        geo_distribution: { 'US': 110, 'EU': 60, 'Asia': 28 },
        influence_score: 82,
        recency_score: 87,
        timeline: generateDetailedTimeline(145)
      },
      entities: ['Risk Management', 'Compliance', 'Contract Analysis', 'Due Diligence'],
      citations: [
        { source: 'Harvard Business Review', headline: 'Automated Risk Detection Reduces Contract Disputes', url: '#', date: '2024-09-26' },
        { source: 'WSJ', headline: 'AI Risk Analysis Tools Gain Corporate Trust', url: '#', date: '2024-09-22' }
      ]
    });
  }

  // Add SaaS/platform trends if relevant
  if (isSaaSRelated || isAIRelated) {
    allTrends.push({
      trend_id: 'saas_ai_integration',
      title: 'SaaS Platforms Rapidly Integrate AI Capabilities',
      summary: `87% of SaaS companies now offer AI features, with document intelligence and automation leading adoption. AI-enhanced SaaS tools see 3x higher customer retention rates.`,
      metrics: {
        article_count: 276,
        growth_rate: '+165%',
        sentiment: { positive: 73, neutral: 20, negative: 7 },
        geo_distribution: { 'US': 160, 'EU': 80, 'Asia': 36 },
        influence_score: 86,
        recency_score: 90,
        timeline: generateDetailedTimeline(165)
      },
      entities: ['SaaS AI', 'Enterprise Software', 'API Integration', 'Workflow Automation'],
      citations: [
        { source: 'SaaS Magazine', headline: 'AI Integration Becomes Table Stakes for SaaS', url: '#', date: '2024-09-28' },
        { source: 'TechCrunch', headline: 'How AI is Reshaping the SaaS Landscape', url: '#', date: '2024-09-25' }
      ]
    });
  }

  // Add general entrepreneurship/validation trends
  allTrends.push({
    trend_id: 'b2b_saas_opportunities',
    title: 'B2B SaaS Market Shows Strong Growth Potential',
    summary: `B2B SaaS market expected to grow at 18% CAGR through 2028. Niche vertical SaaS solutions seeing highest valuations and fastest customer acquisition.`,
    metrics: {
      article_count: 234,
      growth_rate: '+95%',
      sentiment: { positive: 67, neutral: 25, negative: 8 },
      geo_distribution: { 'US': 130, 'EU': 70, 'Asia': 34 },
      influence_score: 79,
      recency_score: 84,
      timeline: generateDetailedTimeline(95)
    },
    entities: ['B2B SaaS', 'Vertical SaaS', 'Enterprise Software', 'SMB Market'],
    citations: [
      { source: 'Gartner', headline: 'B2B SaaS Market Forecast 2024-2028', url: '#', date: '2024-09-27' },
      { source: 'McKinsey', headline: 'The Rise of Vertical SaaS Solutions', url: '#', date: '2024-09-24' }
    ]
  });

  allTrends.push({
    trend_id: 'data_privacy_compliance',
    title: 'Data Privacy and Compliance Drive Technology Adoption',
    summary: `GDPR, CCPA, and emerging regulations create $12B market for compliance technology. Companies increasingly seek automated solutions for contract compliance monitoring.`,
    metrics: {
      article_count: 189,
      growth_rate: '+110%',
      sentiment: { positive: 62, neutral: 28, negative: 10 },
      geo_distribution: { 'US': 95, 'EU': 65, 'Asia': 29 },
      influence_score: 77,
      recency_score: 85,
      timeline: generateDetailedTimeline(110)
    },
    entities: ['GDPR', 'CCPA', 'Compliance Tech', 'RegTech', 'Privacy Law'],
    citations: [
      { source: 'Reuters', headline: 'Compliance Technology Market Reaches $12B', url: '#', date: '2024-09-26' },
      { source: 'Financial Times', headline: 'New Privacy Laws Fuel RegTech Growth', url: '#', date: '2024-09-23' }
    ]
  });

  // Select the most relevant trends (prioritize based on keyword matching)
  const scoredTrends = allTrends.map(trend => {
    const trendText = `${trend.title} ${trend.summary} ${trend.entities.join(' ')}`.toLowerCase();
    let relevanceScore = 0;
    
    // Score based on keyword matches
    keywords.forEach(keyword => {
      if (trendText.includes(keyword)) {
        relevanceScore += 10;
      }
    });
    
    // Boost score for specific categories
    if (isContractRelated && trend.trend_id.includes('contract')) relevanceScore += 20;
    if (isLegalTech && trend.trend_id.includes('legal')) relevanceScore += 20;
    if (isAIRelated && trend.trend_id.includes('ai')) relevanceScore += 15;
    if (isReviewRelated && trend.trend_id.includes('risk')) relevanceScore += 15;
    
    return { ...trend, relevanceScore };
  });

  // Sort by relevance and take top 5
  const relevantTrends = scoredTrends
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);

  const totalArticles = relevantTrends.reduce((sum, t) => sum + t.metrics.article_count, 0);
  
  // Calculate weighted overall sentiment
  const sentimentSum = relevantTrends.reduce((acc, trend) => {
    const weight = trend.metrics.article_count;
    acc.positive += trend.metrics.sentiment.positive * weight;
    acc.neutral += trend.metrics.sentiment.neutral * weight;
    acc.negative += trend.metrics.sentiment.negative * weight;
    acc.total += weight;
    return acc;
  }, { positive: 0, neutral: 0, negative: 0, total: 0 });

  const overall = sentimentSum.total > 0 ? {
    positive: Math.round((sentimentSum.positive / sentimentSum.total)),
    neutral: Math.round((sentimentSum.neutral / sentimentSum.total)),
    negative: Math.round((sentimentSum.negative / sentimentSum.total))
  } : { positive: 60, neutral: 30, negative: 10 };
  
  return {
    news_trends: relevantTrends,
    total_articles: totalArticles,
    overall_sentiment: overall,
    data_quality: 'high',
    confidence: 0.85
  };
}

function generateDetailedTimeline(growthRate: number = 100) {
  const timeline = [];
  const today = new Date();
  const baseValue = 20 + Math.random() * 10;
  
  // Calculate growth factor based on growth rate
  const growthFactor = 1 + (growthRate / 100);
  
  for (let i = 30; i >= 0; i -= 3) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Create realistic growth pattern based on actual growth rate
    const progress = (30 - i) / 30; // 0 to 1
    const trendMultiplier = 1 + (progress * (growthFactor - 1)); // Gradual growth to target
    const randomVariation = 0.85 + Math.random() * 0.3; // Daily variation
    const count = Math.floor(baseValue * trendMultiplier * randomVariation);
    
    timeline.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: count
    });
  }
  return timeline;
}

function generateFallbackTrends() {
  return [{
    trend_id: 'general_tech',
    title: 'Technology Innovation Trends',
    summary: 'General technology and startup ecosystem developments.',
    metrics: {
      article_count: 50,
      growth_rate: '+10%',
      sentiment: { positive: 50, neutral: 30, negative: 20 },
      geo_distribution: { 'Global': 50 },
      influence_score: 50,
      recency_score: 50
    },
    entities: ['Technology', 'Innovation', 'Startups'],
    citations: []
  }];
}
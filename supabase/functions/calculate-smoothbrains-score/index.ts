import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoreFactors {
  wrinklePoints: number; // 0-100+ (user's understanding depth)
  marketSize: number; // in billions
  competitionLevel: number; // 1-10 (1=low competition)
  growthRate: number; // CAGR percentage
  sentiment: number; // 0-100
  executionDifficulty: number; // 1-10 (1=easy)
  productMarketFit: number; // 0-100
  conversationDepth: number; // number of meaningful exchanges
  ideaRefinement: number; // 0-100 (how refined the idea is)
  userAnswerQuality: number; // 0-100 (based on chat quality)
}

/**
 * Calculates a strict SmoothBrains Score (0-100)
 * 100 = FAANG/Microsoft level potential
 * 90+ = Unicorn potential ($1B+ valuation)
 * 80+ = Major success potential ($100M+ valuation)
 * 70+ = Strong business potential ($10M+ valuation)
 * 60+ = Viable business
 * <60 = Needs significant work
 */
function calculateStrictScore(factors: ScoreFactors): {
  score: number;
  breakdown: Record<string, number>;
  category: string;
  explanation: string;
} {
  // Weight distribution (total = 100%)
  const weights = {
    wrinklePoints: 0.25,        // 25% - User's depth of understanding
    marketOpportunity: 0.20,    // 20% - Market size * growth / competition
    productMarketFit: 0.20,     // 20% - PMF signals
    executionViability: 0.15,   // 15% - Can it be built and scaled?
    ideaRefinement: 0.10,       // 10% - How polished is the idea?
    sentiment: 0.10             // 10% - Market reception
  };

  // Calculate individual scores with strict scaling
  
  // 1. Wrinkle Points Score (exponential scaling - hard to get high scores)
  // 0-20 wrinkle points = 0-30 score
  // 20-50 wrinkle points = 30-60 score
  // 50-100 wrinkle points = 60-80 score
  // 100+ wrinkle points = 80-100 score
  let wrinkleScore = 0;
  if (factors.wrinklePoints <= 20) {
    wrinkleScore = (factors.wrinklePoints / 20) * 30;
  } else if (factors.wrinklePoints <= 50) {
    wrinkleScore = 30 + ((factors.wrinklePoints - 20) / 30) * 30;
  } else if (factors.wrinklePoints <= 100) {
    wrinkleScore = 60 + ((factors.wrinklePoints - 50) / 50) * 20;
  } else {
    wrinkleScore = 80 + Math.min((factors.wrinklePoints - 100) / 100 * 20, 20);
  }

  // 2. Market Opportunity Score (requires huge market for high scores)
  // Market score = (market size * growth rate) / competition
  // Needs $100B+ market with high growth and low competition for 90+
  const marketPotential = (factors.marketSize * (1 + factors.growthRate / 100)) / Math.max(factors.competitionLevel, 1);
  let marketScore = 0;
  if (marketPotential < 1) {
    marketScore = marketPotential * 20; // Max 20 for <$1B
  } else if (marketPotential < 10) {
    marketScore = 20 + (marketPotential - 1) / 9 * 20; // 20-40 for $1-10B
  } else if (marketPotential < 50) {
    marketScore = 40 + (marketPotential - 10) / 40 * 20; // 40-60 for $10-50B
  } else if (marketPotential < 100) {
    marketScore = 60 + (marketPotential - 50) / 50 * 20; // 60-80 for $50-100B
  } else {
    marketScore = 80 + Math.min((marketPotential - 100) / 100 * 20, 20); // 80-100 for $100B+
  }

  // 3. Product-Market Fit Score (very strict)
  // Penalize heavily if PMF is below 70
  let pmfScore = 0;
  if (factors.productMarketFit < 30) {
    pmfScore = factors.productMarketFit * 0.5; // Max 15 for poor PMF
  } else if (factors.productMarketFit < 70) {
    pmfScore = 15 + (factors.productMarketFit - 30) / 40 * 35; // 15-50 for moderate PMF
  } else {
    pmfScore = 50 + (factors.productMarketFit - 70) / 30 * 50; // 50-100 for strong PMF
  }

  // 4. Execution Viability Score (harder = lower score)
  // Inverse relationship - easy execution gets higher scores
  const executionScore = Math.max(0, (11 - factors.executionDifficulty) / 10 * 100);

  // 5. Idea Refinement Score (based on chat depth and quality)
  const refinementMultiplier = Math.min(factors.conversationDepth / 10, 1); // Cap at 10 exchanges
  const refinementScore = factors.ideaRefinement * refinementMultiplier;

  // 6. Sentiment Score (strict scaling)
  let sentimentScore = 0;
  if (factors.sentiment < 40) {
    sentimentScore = factors.sentiment * 0.5; // Max 20 for poor sentiment
  } else if (factors.sentiment < 70) {
    sentimentScore = 20 + (factors.sentiment - 40) / 30 * 30; // 20-50 for moderate
  } else {
    sentimentScore = 50 + (factors.sentiment - 70) / 30 * 50; // 50-100 for positive
  }

  // Calculate weighted total
  const breakdown = {
    wrinklePoints: wrinkleScore,
    marketOpportunity: marketScore,
    productMarketFit: pmfScore,
    executionViability: executionScore,
    ideaRefinement: refinementScore,
    sentiment: sentimentScore
  };

  const totalScore = Math.round(
    breakdown.wrinklePoints * weights.wrinklePoints +
    breakdown.marketOpportunity * weights.marketOpportunity +
    breakdown.productMarketFit * weights.productMarketFit +
    breakdown.executionViability * weights.executionViability +
    breakdown.ideaRefinement * weights.ideaRefinement +
    breakdown.sentiment * weights.sentiment
  );

  // Apply strict penalty for incomplete understanding
  const finalScore = factors.wrinklePoints < 10 
    ? Math.min(totalScore, 30) // Cap at 30 if low wrinkle points
    : totalScore;

  // Determine category (very strict)
  let category = "";
  let explanation = "";

  if (finalScore >= 95) {
    category = "FAANG Potential";
    explanation = "This idea shows potential to become a dominant market leader like Microsoft, Google, or Amazon. Exceptional market opportunity combined with deep understanding and strong execution potential.";
  } else if (finalScore >= 90) {
    category = "Unicorn Trajectory";
    explanation = "Strong indicators for $1B+ valuation potential. The combination of massive market, strong PMF signals, and execution clarity rivals successful unicorns.";
  } else if (finalScore >= 80) {
    category = "Major Success Potential";
    explanation = "Shows characteristics of companies that achieve $100M+ valuations. Strong fundamentals with room for explosive growth.";
  } else if (finalScore >= 70) {
    category = "Strong Business";
    explanation = "Solid foundation for a $10M+ business. Good market opportunity with reasonable execution path.";
  } else if (finalScore >= 60) {
    category = "Viable Startup";
    explanation = "Has potential to become a profitable business but needs refinement in key areas to achieve significant scale.";
  } else if (finalScore >= 40) {
    category = "Early Stage";
    explanation = "Shows promise but requires significant development in market understanding, product-market fit, or execution strategy.";
  } else {
    category = "Concept Phase";
    explanation = "Needs substantial work on fundamentals. Focus on deepening market understanding and validating core assumptions.";
  }

  return {
    score: finalScore,
    breakdown,
    category,
    explanation
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      idea, 
      wrinklePoints = 0,
      marketData = {},
      competitionData = {},
      sentimentData = {},
      chatHistory = [],
      userAnswers = {}
    } = await req.json();

    console.log('[SmoothBrains] Calculating strict score for:', idea?.substring(0, 100));
    console.log('[SmoothBrains] Input data:', {
      wrinklePoints,
      marketData,
      competitionData,
      sentimentData,
      chatHistoryLength: chatHistory?.length || 0,
      userAnswersKeys: Object.keys(userAnswers || {})
    });

    // Extract factors from provided data
    const factors: ScoreFactors = {
      wrinklePoints: wrinklePoints || 0,
      
      // Market size in billions (parse from strings like "$2.5B")
      marketSize: parseMarketSize(marketData.TAM || marketData.tam || '0'),
      
      // Competition level (1-10, lower is better)
      competitionLevel: parseCompetitionLevel(competitionData.level || competitionData.score || 5),
      
      // Growth rate (CAGR)
      growthRate: parseGrowthRate(marketData.growth_rate || marketData.growthRate || '10%'),
      
      // Sentiment score (0-100)
      sentiment: parseSentiment(sentimentData.score || sentimentData.sentiment || 50),
      
      // Execution difficulty (1-10, based on complexity)
      executionDifficulty: estimateExecutionDifficulty(idea, chatHistory),
      
      // Product-market fit signals
      productMarketFit: estimatePMF(marketData, sentimentData, competitionData),
      
      // Conversation depth (number of meaningful exchanges)
      conversationDepth: chatHistory.filter((m: any) => m.type === 'user').length || 0,
      
      // Idea refinement (based on answer quality)
      ideaRefinement: calculateIdeaRefinement(idea, chatHistory, userAnswers),
      
      // User answer quality
      userAnswerQuality: evaluateAnswerQuality(userAnswers, chatHistory)
    };

    const result = calculateStrictScore(factors);

    console.log('[SmoothBrains] Score calculated:', result.score, result.category);

    return new Response(
      JSON.stringify({
        success: true,
        score: result.score,
        category: result.category,
        explanation: result.explanation,
        breakdown: result.breakdown,
        factors,
        recommendations: generateRecommendations(result, factors)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[SmoothBrains] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to calculate score' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper functions
function parseMarketSize(value: string): number {
  if (!value || value === '0') return 0;
  const num = parseFloat(value.replace(/[^\d.]/g, ''));
  if (value.toUpperCase().includes('T')) return num * 1000;
  if (value.toUpperCase().includes('B')) return num;
  if (value.toUpperCase().includes('M')) return num / 1000;
  if (value.toUpperCase().includes('K')) return num / 1000000;
  return num || 0;
}

function parseCompetitionLevel(value: any): number {
  if (typeof value === 'number') return Math.min(Math.max(value, 1), 10);
  if (typeof value === 'string') {
    if (value.toLowerCase().includes('low')) return 3;
    if (value.toLowerCase().includes('high')) return 8;
    return 5;
  }
  return 5;
}

function parseGrowthRate(value: string): number {
  return parseFloat(value.replace(/[^\d.]/g, '')) || 10;
}

function parseSentiment(value: any): number {
  // If value is already 0-1, use it directly (don't multiply by 100)
  if (typeof value === 'number' && value >= 0 && value <= 1) {
    return Math.round(value * 100); // Convert 0-1 to 0-100
  }
  // If value is 0-100, use it directly
  if (typeof value === 'number' && value > 1) {
    return Math.min(Math.max(value, 0), 100);
  }
  return 50;
}

function estimateExecutionDifficulty(idea: string, chatHistory: any[]): number {
  // Analyze complexity based on keywords and discussion
  let difficulty = 5;
  
  const complexKeywords = ['ai', 'machine learning', 'blockchain', 'quantum', 'autonomous', 'platform'];
  const simpleKeywords = ['app', 'website', 'tool', 'service', 'marketplace'];
  
  const ideaLower = idea?.toLowerCase() || '';
  
  complexKeywords.forEach(keyword => {
    if (ideaLower.includes(keyword)) difficulty += 1;
  });
  
  simpleKeywords.forEach(keyword => {
    if (ideaLower.includes(keyword)) difficulty -= 0.5;
  });
  
  return Math.min(Math.max(difficulty, 1), 10);
}

function estimatePMF(marketData: any, sentimentData: any, competitionData: any): number {
  let pmf = 50;
  
  // Boost for large market
  if (parseMarketSize(marketData.TAM || '0') > 10) pmf += 10;
  
  // Boost for positive sentiment
  if (parseSentiment(sentimentData.score || 0.5) > 70) pmf += 15;
  
  // Boost for moderate competition (not too low, not too high)
  const competition = parseCompetitionLevel(competitionData.level || 5);
  if (competition >= 3 && competition <= 7) pmf += 10;
  
  // Penalty for very high or very low competition
  if (competition >= 9 || competition <= 1) pmf -= 10;
  
  return Math.min(Math.max(pmf, 0), 100);
}

function calculateIdeaRefinement(idea: string, chatHistory: any[], userAnswers: any): number {
  let refinement = 20; // Base score
  
  // Length and detail of idea
  if (idea && idea.length > 100) refinement += 10;
  if (idea && idea.length > 300) refinement += 10;
  
  // Quality of conversation
  const userMessages = chatHistory.filter((m: any) => m.type === 'user');
  const avgLength = userMessages.reduce((acc: number, m: any) => acc + (m.content?.length || 0), 0) / (userMessages.length || 1);
  if (avgLength > 50) refinement += 15;
  
  // Specific answers provided
  const answerKeys = Object.keys(userAnswers || {});
  refinement += Math.min(answerKeys.length * 5, 25);
  
  return Math.min(refinement, 100);
}

function evaluateAnswerQuality(userAnswers: any, chatHistory: any[]): number {
  let quality = 30; // Base score
  
  // Check for detailed answers
  Object.values(userAnswers || {}).forEach((answer: any) => {
    if (typeof answer === 'string' && answer.length > 50) quality += 5;
  });
  
  // Check for specific data points
  const hasNumbers = chatHistory.some((m: any) => 
    m.type === 'user' && /\d+/.test(m.content || '')
  );
  if (hasNumbers) quality += 15;
  
  return Math.min(quality, 100);
}

function generateRecommendations(result: any, factors: ScoreFactors): string[] {
  const recommendations = [];
  
  if (factors.wrinklePoints < 30) {
    recommendations.push("Focus on earning more Wrinkle Points by providing detailed, thoughtful answers to deepen your understanding");
  }
  
  if (result.breakdown.marketOpportunity < 50) {
    recommendations.push("Research and validate a larger market opportunity or identify high-growth segments");
  }
  
  if (result.breakdown.productMarketFit < 60) {
    recommendations.push("Conduct user interviews and validate product-market fit with potential customers");
  }
  
  if (result.breakdown.executionViability < 70) {
    recommendations.push("Simplify the execution strategy or build a stronger technical team");
  }
  
  if (result.breakdown.sentiment < 50) {
    recommendations.push("Test market reception with surveys or landing pages to improve sentiment signals");
  }
  
  return recommendations;
}
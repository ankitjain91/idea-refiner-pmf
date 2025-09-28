/**
 * AI Cost Optimization Configuration
 * Centralized management for model selection and cost controls
 */

export const AI_MODELS = {
  // Default models for cost efficiency
  DEFAULT: 'gpt-4o-mini',
  SEARCH: 'gpt-5-mini-2025-08-07',
  
  // Premium models for deep analysis
  DEEP_ANALYSIS: 'gpt-4o',
  COMPLEX_REASONING: 'gpt-4o',
  
  // Legacy models (to be phased out)
  LEGACY_MINI: 'gpt-4o-mini',
  LEGACY_TURBO: 'gpt-3.5-turbo',
} as const;

export const MODEL_SELECTION_RULES = {
  // Idea Chat & Brainstorming
  chatExploration: AI_MODELS.DEFAULT,
  chatDeepAnalysis: AI_MODELS.DEEP_ANALYSIS,
  pmfAnalysis: AI_MODELS.DEEP_ANALYSIS,
  suggestions: AI_MODELS.DEFAULT,
  summaries: AI_MODELS.DEFAULT,
  
  // Dashboard & Insights
  dashboardSynthesis: AI_MODELS.DEFAULT,
  webSearch: AI_MODELS.SEARCH,
  marketAnalysis: AI_MODELS.DEFAULT,
  
  // Analysis & Evaluation
  wrinklePoints: AI_MODELS.DEFAULT,
  sessionNaming: AI_MODELS.DEFAULT,
  trickeryDetection: AI_MODELS.DEFAULT,
} as const;

export const COST_CONTROLS = {
  // Rate limiting
  maxWebSearchesPerView: 6,
  maxRetriesPerRequest: 1,
  
  // Token limits
  maxTokensSummary: 150,
  maxTokensSuggestions: 400,
  maxTokensAnalysis: 1100,
  maxTokensSynthesis: 3000,
  
  // Cache TTL (in minutes)
  cacheTTL: {
    sentiment: 15,
    news: 15,
    marketData: 60,
    tam: 60,
    cacLtv: 60,
  },
  
  // Context trimming
  maxSourceSnippetLength: 800,
  maxSearchResultsPerGroup: 12,
  
  // Circuit breaker
  maxFailuresPerDomain: 3,
  failureWindowMinutes: 10,
} as const;

export const PROMPT_TEMPLATES = {
  synthesis: `You are a synthesis engine for the Idea Pursuit Dashboard.
Take grouped search results and output unified JSON for each tile.
Use only real evidence; if unknown, say 'unknown' and add warning.
Max 3 citations per tile. Be concise.`,
  
  groupedSearch1: (keywords: string[], geography: string, timeWindow: string) => 
    `${keywords.join(' ')} market, competitors, demographics, demand, TAM/SAM/SOM, comparable startups, funding ${geography} ${timeWindow}`,
  
  groupedSearch2: (keywords: string[], industry: string, geography: string) =>
    `${keywords.join(' ')} unit economics CAC LTV, risks, regulations, partnerships, investor interest, social sentiment, roadmap best practices ${industry} ${geography}`,
} as const;

/**
 * Determine which model to use based on context
 */
export function selectModel(context: {
  type: 'chat' | 'analysis' | 'synthesis' | 'search' | 'summary';
  depth?: 'shallow' | 'deep';
  requiresReasoning?: boolean;
}): string {
  const { type, depth, requiresReasoning } = context;
  
  // Deep analysis or complex reasoning always uses premium model
  if (depth === 'deep' || requiresReasoning) {
    return AI_MODELS.DEEP_ANALYSIS;
  }
  
  // Web search uses specialized search model
  if (type === 'search') {
    return AI_MODELS.SEARCH;
  }
  
  // Everything else uses cost-efficient default
  return AI_MODELS.DEFAULT;
}

/**
 * Calculate estimated cost for a request
 */
export function estimateCost(model: string, tokens: number): number {
  const costs: Record<string, number> = {
    'gpt-4o-mini': 0.000015, // $0.015 per 1K tokens
    'gpt-4o': 0.00003, // $0.03 per 1K tokens
    'gpt-5-mini-2025-08-07': 0.00002, // $0.02 per 1K tokens
    'gpt-3.5-turbo': 0.000002, // $0.002 per 1K tokens
  };
  
  const costPerToken = costs[model] || costs['gpt-4o-mini'];
  return (tokens / 1000) * costPerToken;
}

/**
 * Track and log AI usage for monitoring
 */
export class AIUsageTracker {
  private static usage: Map<string, { count: number; tokens: number; cost: number }> = new Map();
  
  static track(model: string, tokens: number) {
    const current = this.usage.get(model) || { count: 0, tokens: 0, cost: 0 };
    const cost = estimateCost(model, tokens);
    
    this.usage.set(model, {
      count: current.count + 1,
      tokens: current.tokens + tokens,
      cost: current.cost + cost,
    });
    
    // Log periodically
    if (current.count % 100 === 0) {
      console.log('AI Usage Stats:', Object.fromEntries(this.usage));
    }
  }
  
  static getStats() {
    return Object.fromEntries(this.usage);
  }
  
  static reset() {
    this.usage.clear();
  }
}
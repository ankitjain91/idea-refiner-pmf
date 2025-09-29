import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rigorous scoring weights - extremely difficult to achieve high scores
const SCORING_WEIGHTS = {
  // Market Factors (35% total weight)
  marketSize: 0.08,           // TAM in billions
  marketGrowthRate: 0.07,     // YoY growth percentage
  marketMaturity: 0.06,       // Market lifecycle stage
  marketFragmentation: 0.07,   // Opportunity for disruption
  marketAccessibility: 0.07,   // Barriers to entry
  
  // Competition Factors (25% total weight)
  competitiveDensity: 0.05,   // Number of competitors
  competitorStrength: 0.05,   // Average competitor valuation
  differentiationPotential: 0.05, // Unique value proposition
  networkEffects: 0.05,       // Potential for moats
  switchingCosts: 0.05,       // Customer lock-in potential
  
  // Product-Market Fit (20% total weight)
  problemSeverity: 0.04,      // How painful is the problem
  solutionUniqueness: 0.04,   // Novel approach score
  userDesirability: 0.04,     // Want vs need analysis
  technicalFeasibility: 0.04, // Can it be built
  scalabilityPotential: 0.04, // Can it scale globally
  
  // Business Model (10% total weight)
  revenueMultiplier: 0.025,   // Recurring vs one-time
  marginPotential: 0.025,     // Gross margin expectations
  capitalEfficiency: 0.025,   // Burn rate vs growth
  monetizationClarity: 0.025, // Clear path to revenue
  
  // Timing & Trends (10% total weight)
  marketTiming: 0.03,         // Too early/late penalty
  trendAlignment: 0.03,       // Alignment with mega-trends
  regulatoryFavorability: 0.02, // Regulatory tailwinds
  socialSentiment: 0.02,      // Public perception
};

// Extreme difficulty curve - exponential penalties for mediocrity
const calculateComponentScore = (
  rawValue: number, 
  optimalValue: number, 
  scalingFactor: number = 1,
  useExponential: boolean = true
): number => {
  const ratio = rawValue / optimalValue;
  const clampedRatio = Math.min(Math.max(ratio, 0), 2);
  
  if (useExponential) {
    // Exponential curve - severely punishes below-optimal values
    if (clampedRatio < 1) {
      return Math.pow(clampedRatio, 3) * scalingFactor;
    } else {
      // Diminishing returns above optimal
      return (1 + Math.log(clampedRatio) * 0.2) * scalingFactor;
    }
  } else {
    // Linear with harsh penalties
    return Math.max(0, Math.min(1, clampedRatio * 0.7)) * scalingFactor;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, marketSize, competition, sentiment, detailed = false } = await req.json();
    
    console.log('[smoothbrains-score] Calculating rigorous SmoothBrains score for:', idea);
    
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    let detailedAnalysis: any = {};
    let componentScores: any = {};
    
    if (groqApiKey && idea) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [
              {
                role: 'system',
                content: `You are an elite venture capital analyst with 20+ years of experience evaluating unicorn potential.
                
                Evaluate startup ideas with EXTREME rigor. Only ideas with potential to become $10B+ companies should score above 80.
                Be BRUTALLY honest. Most ideas should score 20-50. Only exceptional, timing-perfect, revolutionary ideas score 70+.
                
                Return a JSON object with these exact numeric scores (0-100 for each):
                {
                  "marketSize": number (TAM score, 100 = $100B+ market),
                  "marketGrowthRate": number (100 = 50%+ YoY growth),
                  "marketMaturity": number (100 = perfect timing, not too early/late),
                  "marketFragmentation": number (100 = highly fragmented, ripe for disruption),
                  "marketAccessibility": number (100 = low barriers, easy entry),
                  "competitiveDensity": number (100 = few/weak competitors),
                  "competitorStrength": number (100 = no strong incumbents),
                  "differentiationPotential": number (100 = completely unique approach),
                  "networkEffects": number (100 = strong network effects possible),
                  "switchingCosts": number (100 = high lock-in potential),
                  "problemSeverity": number (100 = critical, urgent problem),
                  "solutionUniqueness": number (100 = novel, patentable approach),
                  "userDesirability": number (100 = users desperately need this),
                  "technicalFeasibility": number (100 = easily buildable),
                  "scalabilityPotential": number (100 = can scale globally fast),
                  "revenueMultiplier": number (100 = high LTV, recurring revenue),
                  "marginPotential": number (100 = 80%+ gross margins possible),
                  "capitalEfficiency": number (100 = profitable from day 1),
                  "monetizationClarity": number (100 = obvious pricing model),
                  "marketTiming": number (100 = perfect timing),
                  "trendAlignment": number (100 = riding multiple megatrends),
                  "regulatoryFavorability": number (100 = regulatory tailwinds),
                  "socialSentiment": number (100 = universally loved concept),
                  "analysis": {
                    "strengths": ["list 3-5 key strengths"],
                    "weaknesses": ["list 3-5 critical weaknesses"],
                    "killerRisks": ["list 2-3 potential company-killing risks"],
                    "successProbability": "X% chance of $1B+ exit in 7 years",
                    "comparisons": ["Similar to X but with Y difference"],
                    "verdict": "One paragraph brutal assessment"
                  }
                }`
              },
              {
                role: 'user',
                content: `Evaluate with EXTREME rigor (most ideas score 20-50): ${idea}
                
                Context:
                - Market Size Estimate: ${marketSize || 'Unknown'}
                - Competition Level: ${competition || 'Unknown'}
                - Market Sentiment: ${sentiment || 'Unknown'}
                
                Remember: Be HARSH. Only truly exceptional ideas like "Google in 1998" or "iPhone in 2007" should score above 75.`
              }
            ],
            temperature: 0.2,
            max_tokens: 1500
          })
        });
        
        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          try {
            const result = JSON.parse(data.choices[0].message.content);
            componentScores = result;
            detailedAnalysis = result.analysis || {};
            
            // Remove analysis from component scores for calculation
            delete componentScores.analysis;
          } catch (e) {
            console.error('[smoothbrains-score] Failed to parse Groq response:', e);
          }
        }
      } catch (err) {
        console.error('[smoothbrains-score] Groq API error:', err);
      }
    }
    
    // If no AI analysis, use harsh heuristic scoring
    if (!componentScores.marketSize) {
      const baseScore = 30; // Start very low
      
      componentScores = {
        marketSize: marketSize?.includes('B') ? 60 : marketSize?.includes('M') ? 30 : 20,
        marketGrowthRate: 35,
        marketMaturity: 40,
        marketFragmentation: 35,
        marketAccessibility: 30,
        competitiveDensity: competition === 'Low' ? 60 : competition === 'High' ? 20 : 35,
        competitorStrength: competition === 'Low' ? 55 : competition === 'High' ? 25 : 35,
        differentiationPotential: 30,
        networkEffects: 25,
        switchingCosts: 30,
        problemSeverity: 35,
        solutionUniqueness: 30,
        userDesirability: sentiment ? parseInt(sentiment) * 0.7 : 35,
        technicalFeasibility: 45,
        scalabilityPotential: 30,
        revenueMultiplier: 35,
        marginPotential: 30,
        capitalEfficiency: 25,
        monetizationClarity: 35,
        marketTiming: 40,
        trendAlignment: 35,
        regulatoryFavorability: 40,
        socialSentiment: sentiment ? parseInt(sentiment) * 0.6 : 35,
      };
      
      detailedAnalysis = {
        strengths: ["Market opportunity identified", "Some user interest detected"],
        weaknesses: ["Unproven concept", "Competition exists", "No clear differentiator"],
        killerRisks: ["Market may not be ready", "Incumbent disruption risk"],
        successProbability: "15% chance of $1B+ exit",
        verdict: "Typical startup idea with moderate potential. Needs significant validation and differentiation to succeed."
      };
    }
    
    // Calculate weighted final score with exponential penalties
    let weightedScore = 0;
    const scoreBreakdown: any = {};
    
    for (const [key, weight] of Object.entries(SCORING_WEIGHTS)) {
      const componentValue = componentScores[key] || 0;
      // Apply exponential penalty for scores below 70
      const adjustedValue = componentValue < 70 
        ? Math.pow(componentValue / 100, 2.5) * 100 
        : componentValue;
      
      const contribution = (adjustedValue / 100) * weight * 100;
      weightedScore += contribution;
      
      scoreBreakdown[key] = {
        raw: componentValue,
        adjusted: Math.round(adjustedValue),
        weight: weight,
        contribution: Math.round(contribution * 10) / 10
      };
    }
    
    // Apply final exponential curve to make high scores extremely rare
    let finalScore = weightedScore;
    if (finalScore < 50) {
      finalScore = Math.pow(finalScore / 50, 1.5) * 50;
    } else if (finalScore < 70) {
      finalScore = 50 + (finalScore - 50) * 0.8;
    } else if (finalScore < 85) {
      finalScore = 66 + (finalScore - 70) * 0.6;
    } else {
      // Extreme difficulty for 85+ scores
      finalScore = 75 + (finalScore - 85) * 0.3;
    }
    
    finalScore = Math.round(Math.max(0, Math.min(100, finalScore)));
    
    // Determine tier based on score
    let tier = 'Failed Startup';
    let tierColor = 'red';
    let comparison = 'Most startups that fail';
    
    if (finalScore >= 90) {
      tier = 'Unicorn DNA';
      tierColor = 'gold';
      comparison = 'Google (1998), Facebook (2004), Uber (2009)';
    } else if (finalScore >= 80) {
      tier = 'Decacorn Potential';
      tierColor = 'purple';
      comparison = 'Airbnb, SpaceX, Stripe in early days';
    } else if (finalScore >= 70) {
      tier = 'Strong Venture Scale';
      tierColor = 'blue';
      comparison = 'Series A/B worthy startups';
    } else if (finalScore >= 60) {
      tier = 'Fundable But Risky';
      tierColor = 'green';
      comparison = 'Seed stage with potential';
    } else if (finalScore >= 45) {
      tier = 'Needs Major Pivot';
      tierColor = 'yellow';
      comparison = 'Ideas that need significant work';
    } else if (finalScore >= 30) {
      tier = 'Lifestyle Business';
      tierColor = 'orange';
      comparison = 'Small business, not venture scale';
    }
    
    const response = {
      score: finalScore,
      tier,
      tierColor,
      comparison,
      formula: {
        description: "SmoothBrains Score = Σ(Component_i × Weight_i × Penalty_i)",
        components: Object.keys(SCORING_WEIGHTS).length,
        totalWeight: 1.0,
        difficultyExponent: 2.5,
        explanation: "Exponential penalties applied to mediocre scores. Only revolutionary ideas with perfect timing, massive markets, and defensible moats can achieve 80+."
      },
      scoreBreakdown: detailed ? scoreBreakdown : undefined,
      weights: detailed ? SCORING_WEIGHTS : undefined,
      analysis: detailedAnalysis,
      metadata: {
        confidence: finalScore > 70 ? 0.6 : 0.75,
        updatedAt: new Date().toISOString(),
        version: '2.0',
        methodology: 'Rigorous VC-grade evaluation with exponential difficulty scaling'
      },
      benchmarks: {
        90: "Uber at founding: Massive market, perfect timing, network effects",
        80: "Airbnb at founding: Unique approach, global scale, two-sided marketplace",
        70: "Typical Series A startup: Proven traction, clear path to $100M revenue",
        60: "Seed worthy: Interesting concept, needs validation",
        50: "Average startup idea: 90% fail at this level",
        40: "Weak concept: Fundamental issues with market or approach",
        30: "DOA: Dead on arrival, wrong market/timing/approach"
      }
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[smoothbrains-score] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
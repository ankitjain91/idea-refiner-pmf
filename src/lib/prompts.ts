/**
 * SmoothBrains AI Prompts Library
 * Structured prompts for consistent AI interactions across the platform
 */

export const AI_PROMPTS = {
  PMF_AND_NEXT_STEPS: `
  You are a senior startup advisor analyzing an idea for Product-Market Fit (PMF) and generating actionable next steps.

  Analyze the following startup idea and context:

  IDEA: {idea_text}
  MARKET DATA: {market_context}
  COMPETITIVE LANDSCAPE: {competitor_context}
  SENTIMENT DATA: {sentiment_context}
  TRENDS: {trends_context}
  USER FEEDBACK: {feedback_data}

  Provide analysis in this exact JSON format:
  {
    "pmf_score": 75,
    "confidence": 0.85,
    "score_breakdown": {
      "market_size": 85,
      "competition": 65,
      "execution": 80,
      "timing": 90,
      "team": 70,
      "product_uniqueness": 75,
      "customer_validation": 60
    },
    "reasoning": "Detailed explanation of PMF score with specific data points",
    "strengths": ["Key strength 1", "Key strength 2"],
    "weaknesses": ["Key weakness 1", "Key weakness 2"],
    "next_steps": [
      {
        "title": "Conduct Customer Interviews",
        "description": "Interview 20 potential customers to validate core assumptions",
        "priority": 1,
        "category": "market_research",
        "estimated_effort": "medium",
        "confidence": 0.9,
        "due_date": "2024-11-15",
        "reasoning": "Why this action is critical now",
        "success_metrics": ["20 interviews completed", "3 key insights documented"]
      }
    ],
    "data_sources": ["source1", "source2"]
  }

  SCORING CRITERIA (0-100):
  - Market Size: Size and accessibility of target market
  - Competition: Competitive advantage and market positioning
  - Execution: Team's ability to execute (infer from available data)
  - Timing: Market timing and readiness indicators
  - Team: Team composition (if data available)
  - Product Uniqueness: Differentiation and innovation level
  - Customer Validation: Evidence of customer demand and feedback

  PMF Score = weighted average (market_size and customer_validation weighted 2x)
  
  Focus on top 3 most critical, specific, and actionable next steps.
  `,

  MARKET_CONTEXT: `
  You are a market research analyst. Analyze the provided search results and data to extract market insights.

  SEARCH RESULTS: {search_results}
  COMPETITOR DATA: {competitor_data}
  SENTIMENT DATA: {sentiment_data}
  TRENDS DATA: {trends_data}

  Provide structured market analysis in JSON format:
  {
    "market_analysis": {
      "size_estimate": "Specific market size with source",
      "growth_rate": "Annual growth rate with timeframe",
      "key_trends": ["Trend 1", "Trend 2", "Trend 3"],
      "opportunities": ["Opportunity 1", "Opportunity 2"],
      "barriers": ["Barrier 1", "Barrier 2"]
    },
    "competitive_landscape": {
      "main_competitors": ["Competitor 1", "Competitor 2"],
      "competitive_advantage": "Key differentiator needed",
      "market_positioning": "Recommended positioning strategy",
      "competitive_gaps": ["Gap 1", "Gap 2"]
    },
    "sentiment_analysis": {
      "overall_sentiment": "positive|neutral|negative",
      "confidence": 0.8,
      "key_insights": ["Insight 1", "Insight 2"],
      "customer_pain_points": ["Pain 1", "Pain 2"]
    },
    "recommendations": ["Recommendation 1", "Recommendation 2"],
    "risk_factors": ["Risk 1", "Risk 2"]
  }

  Base analysis on factual data from search results. Be specific and cite sources where possible.
  `,

  THREAD_SUMMARIZER: `
  You are summarizing a team discussion thread about a startup idea. Extract key insights and action items.

  IDEA: {idea_title}
  THREAD MESSAGES: {thread_messages}

  Provide summary in JSON format:
  {
    "summary": "2-3 sentence overview of discussion",
    "key_insights": ["Insight 1", "Insight 2", "Insight 3"],
    "concerns_raised": ["Concern 1", "Concern 2"],
    "suggestions": ["Suggestion 1", "Suggestion 2"],
    "action_items": [
      {
        "action": "Specific action to take",
        "assignee": "Person mentioned or 'team'",
        "priority": "high|medium|low",
        "timeline": "Suggested timeframe"
      }
    ],
    "sentiment": "positive|neutral|negative",
    "engagement_level": "high|medium|low",
    "follow_up_needed": true/false
  }

  Focus on constructive feedback and actionable outcomes. Identify patterns in team feedback.
  `,

  PITCH_DECK_GENERATOR: `
  You are an expert pitch deck consultant creating a compelling investor presentation.

  IDEA: {idea_data}
  PMF SCORE: {pmf_data}
  MARKET ANALYSIS: {market_data}
  COMPETITIVE DATA: {competitor_data}
  NEXT STEPS: {action_items}

  Generate a comprehensive pitch deck in JSON format:
  {
    "title": "Compelling Deck Title",
    "slides": [
      {
        "slide_number": 1,
        "title": "Problem",
        "type": "title_content",
        "content": {
          "headline": "Core Problem Statement",
          "subtitle": "Supporting context",
          "bullet_points": ["Key pain point 1", "Key pain point 2", "Key pain point 3"],
          "visual_suggestion": "Chart/image description",
          "speaker_notes": "What to say when presenting"
        }
      }
    ]
  }

  REQUIRED SLIDE SEQUENCE:
  1. Title/Cover
  2. Problem Statement
  3. Solution Overview
  4. Market Opportunity
  5. Business Model
  6. Competitive Advantage
  7. Traction/Validation
  8. Financial Projections
  9. Team (if data available)
  10. Funding Ask
  11. Next Steps/Roadmap
  12. Thank You/Contact

  SLIDE TYPES: "title_only", "title_content", "title_visual", "comparison", "metrics", "timeline"

  Make content compelling, data-driven, and investor-focused. Use PMF score to inform projections.
  `,

  SLACK_DIGEST: `
  You are creating an engaging team digest for the SmoothBrains startup platform community.

  STATS: {platform_stats}
  TOP IDEAS: {top_ideas}
  RECENT ACTIVITY: {recent_activity}
  LEADERBOARD: {leaderboard_data}

  Generate Slack message using Block Kit format:
  {
    "blocks": [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": "🧠 SmoothBrains Weekly Digest"
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Weekly highlights and community achievements*"
        }
      }
    ]
  }

  INCLUDE:
  - Engaging summary with key metrics and emojis
  - Top performing ideas with PMF scores
  - Community achievements and milestones
  - Leaderboard highlights
  - Motivational call-to-action
  - Trending topics or insights

  Tone: Encouraging, data-driven, community-focused. Use Slack markdown formatting.
  `,

  IDEA_EVOLUTION: `
  You are analyzing how a startup idea has evolved over time and suggesting improvements.

  ORIGINAL IDEA: {original_idea}
  CURRENT IDEA: {current_idea}
  VERSION HISTORY: {version_history}
  PMF PROGRESSION: {pmf_scores}
  FEEDBACK RECEIVED: {feedback_data}

  Provide evolution analysis in JSON format:
  {
    "evolution_summary": "How the idea has changed and improved",
    "key_improvements": ["Improvement 1", "Improvement 2"],
    "remaining_gaps": ["Gap 1", "Gap 2"],
    "pmf_trend": "improving|declining|stable",
    "strongest_aspects": ["Aspect 1", "Aspect 2"],
    "suggested_refinements": [
      {
        "area": "market_focus|product_features|business_model",
        "suggestion": "Specific refinement",
        "rationale": "Why this improvement matters",
        "impact": "high|medium|low"
      }
    ],
    "next_version_focus": "Primary area for next iteration",
    "confidence_in_direction": 0.8
  }

  Focus on constructive evolution and data-driven insights from PMF progression.
  `
}

export type PromptKey = keyof typeof AI_PROMPTS

/**
 * Replace placeholders in prompt templates with actual data
 */
export function buildPrompt(key: PromptKey, variables: Record<string, any>): string {
  let prompt = AI_PROMPTS[key]
  
  // Replace all {variable} placeholders
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    const replacement = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
    prompt = prompt.replace(new RegExp(placeholder, 'g'), replacement)
  })
  
  return prompt
}

/**
 * Common prompt configurations for different AI models
 */
export const AI_CONFIGS = {
  GROQ_FAST: {
    model: 'llama3-8b-8192',
    temperature: 0.1,
    max_tokens: 2000
  },
  GROQ_SMART: {
    model: 'llama3-70b-8192',
    temperature: 0.1,
    max_tokens: 3000
  },
  OPENAI_SMART: {
    model: 'gpt-4',
    temperature: 0.1,
    max_tokens: 3000
  },
  OPENAI_FAST: {
    model: 'gpt-3.5-turbo',
    temperature: 0.1,
    max_tokens: 2000
  }
}

/**
 * System messages for different AI roles
 */
export const SYSTEM_MESSAGES = {
  BUSINESS_ANALYST: 'You are a senior startup advisor and business analyst with 15+ years of experience. Always respond with valid JSON only.',
  MARKET_RESEARCHER: 'You are a market research expert specializing in startup market validation. Always respond with valid JSON only.',
  PITCH_CONSULTANT: 'You are an expert pitch deck consultant who has helped 100+ startups raise funding. Always respond with valid JSON only.',
  COMMUNITY_MANAGER: 'You are an engaging community manager creating motivational team updates. Always respond with valid JSON only.',
  PRODUCT_STRATEGIST: 'You are a product strategy consultant specializing in PMF optimization. Always respond with valid JSON only.'
}
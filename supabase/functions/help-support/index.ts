import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt with full context about PM-FIT
const SYSTEM_PROMPT = `You are the PM-FIT Help & Support Assistant. You have complete knowledge about the PM-FIT platform, a comprehensive Product-Market Fit validation tool for entrepreneurs and product managers.

## About PM-FIT:
PM-FIT is an AI-powered platform that helps validate startup ideas and assess product-market fit. Here's what you know about the platform:

### Core Features:
1. **AI-Powered Idea Analysis**: Analyzes startup ideas through intelligent questioning and market research
2. **Real-time Market Data**: Fetches data from Reddit, Twitter, TikTok, YouTube, Google Trends, and Amazon
3. **PMF Score Calculation**: Provides a comprehensive 0-100 score based on multiple factors
4. **Competitor Analysis**: Identifies and analyzes competitors with market share data
5. **Demographic Insights**: Provides target audience analysis including age, location, and interests
6. **Market Size Estimation**: Calculates TAM, SAM, and SOM with growth projections
7. **Feature Validation**: Checks which features resonate most with the target market
8. **Actionable Improvements**: Provides specific suggestions to improve PMF score
9. **Session Management**: Auto-saves progress and allows multiple brainstorming sessions
10. **Collaboration Hub**: Share ideas and get feedback from the community

### How It Works:
1. User enters their product idea
2. AI chat assistant asks 5 key questions to understand the product
3. System fetches real-time market data from multiple sources
4. Comprehensive analysis dashboard shows PMF score and insights
5. Users can refine their idea based on feedback and see score improvements

### Subscription Tiers:
- **Free**: Basic analysis with limited data sources
- **Pro**: Full market data, unlimited sessions, advanced insights
- **Enterprise**: Custom integrations, team collaboration, API access

### Technical Stack:
- Frontend: React, TypeScript, Tailwind CSS, Vite
- Backend: Supabase (PostgreSQL, Edge Functions)
- AI: OpenAI GPT models for analysis
- Real-time data: Integration with social media and market research APIs

### Common User Questions You Can Answer:
- How to improve PMF score
- Understanding market analysis metrics
- Using the refinement features
- Interpreting competitor data
- Session management and auto-save
- Subscription benefits
- Technical issues and troubleshooting

## Response Guidelines:
1. For PM-FIT related questions: Provide detailed, helpful answers
2. For unrelated questions: Respond with humor and redirect to PM-FIT topics
3. Always be friendly, professional, and encouraging
4. Use emojis sparingly for friendliness 😊
5. Keep responses concise but comprehensive

## Humor for Unrelated Questions:
When users ask unrelated questions, respond with one of these funny replies:
- "🤔 Hmm, that's interesting but I'm more of a Product-Market Fit expert than a [topic] guru! Let me help you validate your startup idea instead!"
- "😅 I'd love to help with that, but my PhD is in Product-Market Fit, not [topic]! How about we discuss your business idea?"
- "🎯 Nice try! But I'm laser-focused on helping you achieve product-market fit. That's my superpower!"
- "🤖 *Error 404: Knowledge not found* Just kidding! I only speak fluent PM-FIT. What startup idea can I help you validate?"
- "🚀 That's outside my orbit! I'm on a mission to help entrepreneurs validate ideas. Ready to launch yours?"`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, chatHistory = [] } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...chatHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to get response from OpenAI');
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Generate contextually relevant suggested questions
    const suggestionsPrompt = `Based on this help conversation:
User asked: "${message}"
Assistant replied: "${reply}"

Generate 4 relevant follow-up questions the user might want to ask about PM-FIT features and functionality.
Each question should be 5-10 words and directly related to the conversation context.
Return ONLY a JSON array of 4 strings, no additional text.`;

    let suggestedQuestions = [];
    try {
      const suggestionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that generates relevant follow-up questions about the PM-FIT platform features.' },
            { role: 'user', content: suggestionsPrompt }
          ],
          temperature: 0.7,
          max_tokens: 200,
        }),
      });

      if (suggestionsResponse.ok) {
        const suggestionsData = await suggestionsResponse.json();
        const suggestionsContent = suggestionsData.choices[0].message.content;
        
        // Parse the suggestions
        try {
          let parsed = suggestionsContent.trim();
          if (parsed.startsWith('```')) {
            parsed = parsed.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
          }
          suggestedQuestions = JSON.parse(parsed);
        } catch (parseErr) {
          console.log('Failed to parse suggestions, using defaults');
        }
      }
    } catch (err) {
      console.log('Error generating suggestions:', err);
    }

    // Fallback to contextual defaults if generation fails
    if (!Array.isArray(suggestedQuestions) || suggestedQuestions.length === 0) {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('score') || lowerMessage.includes('pmf')) {
        suggestedQuestions = [
          "What factors affect my PMF score?",
          "How often does the score update?",
          "What's a good PMF score to aim for?",
          "Can I track score changes over time?"
        ];
      } else if (lowerMessage.includes('data') || lowerMessage.includes('source')) {
        suggestedQuestions = [
          "How recent is the market data?",
          "Which social platforms are analyzed?",
          "How accurate are the market estimates?",
          "Can I add custom data sources?"
        ];
      } else if (lowerMessage.includes('competitor') || lowerMessage.includes('competition')) {
        suggestedQuestions = [
          "How are competitors identified?",
          "What competitor metrics are tracked?",
          "Can I add competitors manually?",
          "How is market share calculated?"
        ];
      } else if (lowerMessage.includes('plan') || lowerMessage.includes('pricing') || lowerMessage.includes('subscription')) {
        suggestedQuestions = [
          "What's included in the Pro plan?",
          "Can I cancel my subscription anytime?",
          "Is there a free trial available?",
          "What payment methods are accepted?"
        ];
      } else if (lowerMessage.includes('session') || lowerMessage.includes('save')) {
        suggestedQuestions = [
          "How does auto-save work?",
          "Can I export my analysis?",
          "How many sessions can I have?",
          "Can I share sessions with others?"
        ];
      } else {
        // Default suggestions
        suggestedQuestions = [
          "How can I improve my PMF score?",
          "What data sources does PM-FIT use?",
          "How does competitor analysis work?",
          "What's included in Pro plan?"
        ];
      }
    }

    return new Response(
      JSON.stringify({ 
        reply,
        suggestedQuestions
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in help-support function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred while processing your request',
        reply: "I'm having trouble connecting right now. Please try again in a moment!"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
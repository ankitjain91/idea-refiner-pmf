import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    console.log('[GENERATE-SUGGESTIONS] Function started');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { question, ideaDescription, previousAnswers } = await req.json();
    
    console.log('[GENERATE-SUGGESTIONS] Generating suggestions for:', question);
    console.log('[GENERATE-SUGGESTIONS] Idea context:', ideaDescription);
    console.log('[GENERATE-SUGGESTIONS] Previous answers:', previousAnswers);

    // Create a context-aware prompt that generates actual answers to the question
    const systemPrompt = `You are an expert startup advisor helping entrepreneurs achieve optimal Product-Market Fit. Your goal is to suggest answers that would maximize their PM-FIT score by addressing key success factors: market demand, pain point intensity, competition gaps, differentiation, and distribution readiness.`;
    
    const userPrompt = `
Context:
- Startup Idea: "${ideaDescription || 'New startup idea being developed'}"
- Previous answers: ${previousAnswers ? Object.entries(previousAnswers).map(([q, a]) => `${q}: ${a}`).join(' | ') : 'None yet'}

Current Question: "${question}"

Generate 4 high-quality, strategic suggestions that directly answer this question to help achieve optimal Product-Market Fit. Each suggestion should be:

1. A complete, specific answer to the question (not a prompt or partial thought)
2. Strategic and likely to maximize PM-FIT score
3. Contextually relevant to the startup idea
4. 15-30 words for clarity and completeness
5. Actionable and practical

Focus on demonstrating:
- Clear market demand and pain point resolution
- Strong competitive differentiation
- Scalability and growth potential
- Clear path to profitability

Format: Return ONLY a JSON array of 4 suggestion strings, no markdown or explanation.

Example output format:
["First complete strategic answer addressing the question directly",
 "Second insightful answer with specific market positioning",
 "Third answer highlighting unique value and differentiation",
 "Fourth answer demonstrating scalability and growth potential"]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',  // Using more powerful model for better suggestions
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,  // Increased for complete answers
        temperature: 0.8,  // Slightly higher for more creative suggestions
        presence_penalty: 0.6,  // Reduce repetition
        frequency_penalty: 0.3  // Encourage variety
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GENERATE-SUGGESTIONS] OpenAI API error:', errorText);
      console.error('[GENERATE-SUGGESTIONS] Status:', response.status);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[GENERATE-SUGGESTIONS] OpenAI response:', JSON.stringify(data, null, 2));
    
    let suggestions: string[] = [];
    try {
      const content = data.choices?.[0]?.message?.content || '';

      if (!content || content.trim() === '') {
        throw new Error('Empty response from OpenAI');
      }

      // Remove code fences and try to extract JSON
      let text = content.trim();
      if (text.startsWith('```')) {
        const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fenceMatch) {
          text = fenceMatch[1].trim();
        }
      }

      // Try parsing JSON directly; if it fails, extract first JSON array
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          parsed = JSON.parse(arrayMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      }

      if (Array.isArray(parsed)) {
        suggestions = parsed as string[];
      } else if (parsed && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions as string[];
      } else {
        throw new Error('Parsed response is not an array');
      }

      // Normalize suggestions: ensure they are proper strings
      suggestions = (suggestions || [])
        .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        .map((s: string) => s.replace(/\s+/g, ' ').trim())
        .slice(0, 4);

      if (suggestions.length < 4) throw new Error('Insufficient suggestions after normalization');
    } catch (parseError) {
      console.error('[GENERATE-SUGGESTIONS] Failed to parse suggestions:', parseError);
      // Check if API key is missing first
      if (!openAIApiKey) {
        console.error('[GENERATE-SUGGESTIONS] No OpenAI API key configured');
        suggestions = [
          'API key not configured properly',
          'Please check OpenAI settings',
          'Contact support for assistance',
          'Using fallback suggestions only'
        ];
      } else {
        // Generate contextual fallback suggestions based on the question
        const lowerQ = (question || '').toLowerCase();
        
        if (lowerQ.includes('target audience') || lowerQ.includes('who is your')) {
          suggestions = [
            'Tech-savvy early adopters aged 25-40 in major metropolitan areas seeking innovative solutions',
            'Small to medium businesses with 10-100 employees looking to optimize operational efficiency',
            'Budget-conscious consumers prioritizing value and quality over brand names in purchasing decisions',
            'Enterprise clients requiring scalable, secure solutions with dedicated support and customization options'
          ];
        } else if (lowerQ.includes('problem') || lowerQ.includes('pain point')) {
          suggestions = [
            'Current solutions take 10x longer and cost 5x more than necessary for basic tasks',
            'No existing platform integrates all required features forcing users to juggle multiple tools',
            'Manual processes cause 30% error rates leading to significant revenue loss and customer churn',
            'Lack of real-time insights prevents data-driven decisions causing missed growth opportunities'
          ];
        } else if (lowerQ.includes('unique value') || lowerQ.includes('proposition') || lowerQ.includes('different')) {
          suggestions = [
            'First AI-powered solution delivering 10x faster results with 90% accuracy improvement guaranteed',
            'Only platform combining all essential features at 50% lower cost than competitors',
            'Patented technology solving previously impossible problems with proven ROI within 30 days',
            'Zero learning curve with intuitive design reducing onboarding from weeks to hours'
          ];
        } else if (lowerQ.includes('monetization') || lowerQ.includes('revenue') || lowerQ.includes('pricing')) {
          suggestions = [
            'Freemium model with $29/month pro tier targeting 20% conversion rate after trial',
            'Usage-based pricing starting at $99/month scaling with customer growth and value delivered',
            'Enterprise licensing at $10K/year with unlimited users and premium support included',
            'Transaction-based model taking 2.5% commission on platform-facilitated deals and exchanges'
          ];
        } else if (lowerQ.includes('competitor') || lowerQ.includes('competition')) {
          suggestions = [
            'Three established players dominate but lack innovation and have poor user experience ratings',
            'Fragmented market with no clear leader creating opportunity for superior solution to win',
            'Legacy solutions from 2010s haven\'t adapted to modern user needs and expectations',
            'High-priced enterprise solutions leaving SMB market completely underserved and seeking alternatives'
          ];
        } else {
          // Generic fallback for unknown questions
          suggestions = [
            'Comprehensive market research indicates strong demand with limited quality solutions available currently',
            'Data-driven approach validated through customer interviews and prototype testing with target users',
            'Leveraging emerging technologies to create competitive advantages traditional players cannot match quickly',
            'Building strategic partnerships to accelerate growth and establish market leadership position early'
          ];
        }
      }
    }

    // Ensure we have exactly 4 suggestions
    suggestions = (suggestions || []).slice(0, 4);

    console.log('[GENERATE-SUGGESTIONS] Final suggestions:', suggestions);

    return new Response(
      JSON.stringify({ suggestions }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[GENERATE-SUGGESTIONS] Error:', error);
    
    // Return fallback suggestions on error
    return new Response(
      JSON.stringify({ 
        suggestions: [
          'Need more context to generate ideas',
          'Researching best approach for this', 
          'Requires deeper analysis and specifics',
          'Share details to tailor suggestions'
        ],
        error: (error as Error).message 
      }),
      {
        status: 200, // Return 200 with fallback suggestions
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
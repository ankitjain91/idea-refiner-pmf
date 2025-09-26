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
Startup Idea: "${ideaDescription || 'Not provided yet'}"

Previous conversation context (Q: A):
${previousAnswers ? Object.entries(previousAnswers).map(([q, a]) => `${q}: ${a}`).join('\n') : 'None'}

Current Question: "${question}"

Instructions:
- Generate exactly 4 OPTIMAL ANSWERS to the question above that would MAXIMIZE PM-FIT score
- Each answer should be strategic and would improve different PM-FIT factors (demand, pain intensity, differentiation, distribution)
- Each suggestion must directly answer the question asked
- Each suggestion must be exactly 5 words
- These should be the BEST possible answers that would lead to highest PM-FIT score
- Think about what answers would indicate strong product-market fit
- Return ONLY a JSON array of 4 strings; no code fences, no additional text

Example for "What's your unique value proposition?":
["10x faster than any competitor",
 "Solves previously impossible technical problem",
 "90% cost reduction for enterprises",
 "First AI-powered solution in market"]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // Fast model for quick suggestions
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7
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

      // Normalize suggestions: strings only, exactly 5 words, top 4
      suggestions = (suggestions || [])
        .filter((s: any) => typeof s === 'string')
        .map((s: string) => s.replace(/\s+/g, ' ').trim())
        .map((s: string) => {
          const words = s.split(' ').filter(Boolean);
          return words.length >= 5 ? words.slice(0, 5).join(' ') : s;
        })
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
      const lowerQ = (question || '').toLowerCase();
      if (lowerQ.includes('target audience')) {
        suggestions = [
          'Tech-savvy millennials in urban areas',
          'Small business owners seeking efficiency',
          'Parents looking for family solutions',
          'Students and young professionals nationwide',
        ];
      } else if (lowerQ.includes('problem')) {
        suggestions = [
          'Saves time on repetitive tasks',
          'Reduces costs and operational overhead',
          'Improves cross-functional team collaboration',
          'Provides actionable real-time data insights',
        ];
      } else if (
        lowerQ.includes('budget') ||
        lowerQ.includes('pricing') ||
        lowerQ.includes('price point') ||
        lowerQ.includes('price') ||
        lowerQ.includes('customer acquisition') ||
        lowerQ.includes('cac')
      ) {
        suggestions = [
          'Target CAC $5–$15 per signup',
          'Early tests $2–$6 per lead',
          'Paid social $8–$20 per signup',
          'Content SEO $1–$4 per signup',
        ];
      } else if (lowerQ.includes('value proposition') || lowerQ.includes('unique value')) {
        suggestions = [
          '10x faster than any competitor',
          'Solves previously impossible technical problem',
          '90% cost reduction for enterprises',
          'First AI-powered solution in market',
        ];
      } else {
        suggestions = [
          'Need more context to generate ideas',
          'Researching best approach for this',
          'Requires deeper analysis and specifics',
          'Share details to tailor suggestions',
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
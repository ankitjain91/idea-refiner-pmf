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

    // Create a context-aware prompt
    const systemPrompt = `You are an expert startup advisor helping entrepreneurs validate their ideas through Product-Market Fit analysis. Generate specific, contextual answer suggestions based on the user's startup idea.`;
    
    const userPrompt = `
Startup Idea: "${ideaDescription || 'Not provided yet'}"

Previous conversation context (Q: A):
${previousAnswers ? Object.entries(previousAnswers).map(([q, a]) => `${q}: ${a}`).join('\n') : 'None'}

Current Question: "${question}"

Instructions:
- Generate exactly 4 sample answers tailored to the startup idea above
- Each suggestion must be highly specific and contextual
- Each suggestion must be exactly 5 words
- Make the 4 suggestions diverse (different strategies/angles)
- Return ONLY a JSON array of 4 strings; no code fences, no additional text

Good example format (not to copy):
["Busy parents needing simpler budgeting",
 "Freelancers managing irregular monthly income",
 "Creators juggling multi-platform client invoices",
 "Digital nomads handling cross-border payments"]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
          'Faster, simpler workflow than competitors',
          'Automated insights reducing manual effort',
          'Seamless integrations with existing tools',
          'Personalized recommendations improving outcomes',
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
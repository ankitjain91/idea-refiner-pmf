import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

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
    
    if (!GROQ_API_KEY) {
      throw new Error('Groq API key not configured');
    }

    const { question, ideaDescription, previousAnswers } = await req.json();
    
    console.log('[GENERATE-SUGGESTIONS] Generating suggestions for:', question);
    console.log('[GENERATE-SUGGESTIONS] Idea context:', ideaDescription);
    console.log('[GENERATE-SUGGESTIONS] Previous answers:', previousAnswers);

    // Create a context-aware prompt that generates user-focused conversational suggestions
    const systemPrompt = `You are helping a user have a productive conversation about their startup idea. Generate suggestions for what the USER should say next to continue the discussion naturally. Never suggest what the AI should say - only what the user might want to say, ask, or clarify.`;
    
    const userPrompt = `
Context:
- User's Startup Idea: "${ideaDescription || 'New startup idea being developed'}"
- Previous conversation: ${previousAnswers ? Object.entries(previousAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n') : 'None yet'}

Current situation: The AI just asked: "${question}"

Generate 4 natural suggestions for what the USER could say next. Each suggestion should be:

1. A natural user response - either answering the question, asking for clarification, or providing relevant information
2. Written from the user's perspective (first person "I" statements when appropriate)
3. Contextually relevant to continue the conversation forward
4. Concise (10-25 words) but complete thoughts
5. Varied in approach - mix direct answers, clarifications, and follow-up questions

Types to include:
- Direct answer to the question asked
- Request for clarification or examples
- Providing additional context about their idea
- Asking about implications or next steps

Format: Return ONLY a JSON array of 4 suggestion strings, no markdown or explanation.

Example for "Who is your target audience?":
["Young professionals aged 25-35 who struggle with time management and productivity",
 "Can you give me examples of different target audiences I should consider?",
 "I'm thinking B2B, but not sure if B2C would be better - what matters most?",
 "Remote workers and digital nomads who need flexible collaboration tools"]`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',  // Fast model for conversational suggestions
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.9,  // Higher for natural variation
        presence_penalty: 0.7,  // Encourage diverse suggestions
        frequency_penalty: 0.4  // Avoid repetitive patterns
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GENERATE-SUGGESTIONS] Groq API error:', errorText);
      console.error('[GENERATE-SUGGESTIONS] Status:', response.status);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[GENERATE-SUGGESTIONS] Groq response:', JSON.stringify(data, null, 2));
    
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
      if (!GROQ_API_KEY) {
        console.error('[GENERATE-SUGGESTIONS] No Groq API key configured');
        suggestions = [
          'API key not configured properly',
          'Please check Groq settings',
          'Contact support for assistance',
          'Using fallback suggestions only'
        ];
      } else {
        // Generate contextual fallback suggestions based on the question - from user's perspective
        const lowerQ = (question || '').toLowerCase();
        
        if (lowerQ.includes('target audience') || lowerQ.includes('who is your')) {
          suggestions = [
            'Young professionals who need better work-life balance tools',
            'Can you help me identify the most profitable target segment?',
            'I think SMBs, but how do I validate this assumption?',
            'People frustrated with existing solutions in this space'
          ];
        } else if (lowerQ.includes('problem') || lowerQ.includes('pain point')) {
          suggestions = [
            'Current solutions are too expensive and complicated for most users',
            'What specific pain points should I focus on first?',
            'People waste hours daily due to inefficient processes',
            'I need help articulating the core problem more clearly'
          ];
        } else if (lowerQ.includes('unique value') || lowerQ.includes('proposition') || lowerQ.includes('different')) {
          suggestions = [
            'We\'re 10x faster and half the price of alternatives',
            'How can I better differentiate from existing competitors?',
            'Our AI-powered approach is completely unique in this market',
            'Should I focus more on price or features for differentiation?'
          ];
        } else if (lowerQ.includes('monetization') || lowerQ.includes('revenue') || lowerQ.includes('pricing')) {
          suggestions = [
            'Thinking subscription model, $20-50 per month range',
            'What pricing model works best for B2B SaaS?',
            'Freemium with premium features at $99/month',
            'Not sure yet - what would you recommend for my idea?'
          ];
        } else if (lowerQ.includes('competitor') || lowerQ.includes('competition')) {
          suggestions = [
            'There are 3 main players but they\'re all outdated',
            'How do I analyze my competition effectively?',
            'No direct competitors, but several indirect ones exist',
            'I\'m not sure who my real competitors are - can you help?'
          ];
        } else {
          // Generic fallback for unknown questions - conversational user responses
          suggestions = [
            'I need more guidance on how to answer this properly',
            'Can you give me some examples to consider?',
            'Let me think about this - what\'s most important here?',
            'I have some ideas but would like your input first'
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
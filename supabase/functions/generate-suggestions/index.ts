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

    // Create a context-aware prompt that generates predictive, actionable user responses
    const systemPrompt = `You are predicting what a user would most likely say next in a startup idea conversation. Generate PREDICTIVE suggestions - actual answers and statements the user would say, NOT questions asking for help. These should sound like confident responses from someone developing their startup.`;
    
    const userPrompt = `
Context:
- User's Startup Idea: "${ideaDescription || 'New startup idea being developed'}"
- Previous conversation: ${previousAnswers ? Object.entries(previousAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n') : 'None yet'}

Current situation: The AI just asked: "${question}"

Generate 4 PREDICTIVE suggestions - what the user would LIKELY SAY, not questions they would ask. Each suggestion should be:

1. A confident, specific answer or statement (NOT a question asking for help)
2. Written from user's perspective with concrete details
3. Varied in specificity - from clear answers to exploratory statements
4. Concise (10-25 words) but substantive
5. Sound like someone who is developing their idea, not seeking basic guidance

CRITICAL: Predict actual ANSWERS and STATEMENTS, not questions like "Can you help me with X?" or "What should I consider?"

Example for "Who is your target audience?":
["Young professionals aged 25-35 in tech who struggle with remote team collaboration",
 "Small business owners with 10-50 employees who need affordable automation tools",
 "I'm targeting both B2B and B2C - enterprise teams and individual power users",
 "Remote workers and freelancers who value productivity and work-life balance"]

Format: Return ONLY a JSON array of 4 suggestion strings, no markdown or explanation.`;

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
            'Young professionals aged 25-40 in tech who need better productivity tools',
            'Small to medium businesses with 10-100 employees looking to automate workflows',
            'Remote teams and digital nomads who value flexible collaboration',
            'Enterprise customers in finance and healthcare who need compliance-ready solutions'
          ];
        } else if (lowerQ.includes('problem') || lowerQ.includes('pain point')) {
          suggestions = [
            'Current solutions are too expensive and require months of training to implement',
            'Teams waste 5-10 hours weekly on manual data entry and coordination',
            'Users struggle with fragmented tools that don\'t integrate with their existing stack',
            'The market lacks affordable, user-friendly options for non-technical users'
          ];
        } else if (lowerQ.includes('unique value') || lowerQ.includes('proposition') || lowerQ.includes('different')) {
          suggestions = [
            'We deliver 10x faster results at 50% the cost through AI automation',
            'Our platform is the only one with real-time collaboration and offline-first architecture',
            'We combine enterprise-grade security with consumer-level simplicity',
            'Unlike competitors, we offer white-label customization and native integrations'
          ];
        } else if (lowerQ.includes('monetization') || lowerQ.includes('revenue') || lowerQ.includes('pricing')) {
          suggestions = [
            'Tiered subscription: $29/mo starter, $99/mo pro, $299/mo enterprise',
            'Freemium model with 14-day premium trial, then $49/mo for unlimited access',
            'Usage-based pricing at $0.10 per transaction plus $19/mo base fee',
            'Annual contracts for enterprise ($5k-50k) and monthly for SMBs ($99-499)'
          ];
        } else if (lowerQ.includes('competitor') || lowerQ.includes('competition')) {
          suggestions = [
            'Main competitors are Asana, Monday.com, and ClickUp but they lack our AI features',
            'We compete with Salesforce and HubSpot in CRM but focus on smaller teams',
            'No direct competitors - we\'re creating a new category between project management and CRM',
            'Legacy players like Jira dominate but struggle with modern UX and mobile-first users'
          ];
        } else {
          // Generic fallback for unknown questions - predictive answers
          suggestions = [
            'I\'m focusing on solving this through automation and smart workflows',
            'My approach combines AI capabilities with human-centered design',
            'We plan to launch an MVP in 3 months and iterate based on user feedback',
            'I\'ve validated this with 20+ potential customers who showed strong interest'
          ];
        }
      }
    }

    // Ensure we have exactly 4 suggestions
    suggestions = (suggestions || []).slice(0, 4);

    console.log('[GENERATE-SUGGESTIONS] Final suggestions:', suggestions);
    
    // Track AI credits usage
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
          
          if (user?.id) {
            const creditsUsed = 5; // suggestions generation costs 5 credits
            
            // Get current billing period
            const { data: periodData } = await supabase.rpc('get_current_billing_period');
            const billingPeriodStart = periodData?.[0]?.period_start || new Date().toISOString();
            const billingPeriodEnd = periodData?.[0]?.period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            
            // Increment AI credits usage
            await supabase.rpc('increment_usage', {
              _user_id: user.id,
              _type: 'ai_credits',
              _amount: creditsUsed
            });
            
            // Log detailed usage
            await supabase.from('ai_credits_usage').insert({
              user_id: user.id,
              operation_type: 'generate-suggestions',
              credits_used: creditsUsed,
              billing_period_start: billingPeriodStart,
              billing_period_end: billingPeriodEnd
            });
          }
        }
      } catch (error) {
        console.error('[GENERATE-SUGGESTIONS] Error tracking AI credits:', error);
      }
    }

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
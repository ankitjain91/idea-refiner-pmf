import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry helper with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error;
      console.error(`[Groq Summary] Attempt ${i + 1} failed:`, error.message);
      
      if (i < maxRetries) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`[Groq Summary] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { messages, existingSummary } = await req.json();
    
    if (!messages || messages.length === 0) {
      console.error('[Groq Summary] No messages provided in request');
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      console.error('[Groq Summary] GROQ_API_KEY environment variable not configured');
      throw new Error('GROQ_API_KEY not configured - please set it in edge function secrets');
    }

    // Filter and format messages - use ALL messages to understand full context
    const conversationText = messages
      .filter((m: any) => !m.isTyping && m.content && (m.type === 'user' || m.type === 'assistant'))
      .map((m: any) => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    console.log('[Groq Summary] Processing', messages.length, 'messages', existingSummary ? '(updating existing)' : '(generating new)');

    const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: existingSummary 
              ? `You are a startup idea analyzer. Update the existing summary with new conversation information.

CRITICAL RULES:
1. Take the EXISTING SUMMARY and ADD new important details from the recent conversation
2. Generate EXACTLY 2 sentences, no more, no less
3. First sentence: Describe WHAT the startup does (keep from existing, enhance with new details)
4. Second sentence: Describe the PROBLEM/VALUE (keep from existing, add new refinements)
5. Be specific and concrete - incorporate new details from conversation
6. Each sentence should be 15-25 words
7. Use professional, clear language
8. DON'T repeat the same information - only add NEW insights

Example:
EXISTING: "The platform streams indie films with revenue sharing. It helps indie filmmakers reach audiences."
NEW INFO: Discussion about unique referral system and quality metrics
UPDATED: "The platform streams indie films with unique-referral-based revenue sharing. It helps indie filmmakers monetize through quality-focused viewer promotions and engagement tracking."

EXISTING SUMMARY:
${existingSummary}

DO NOT just repeat the existing summary. Add the new information from the recent conversation below.`
              : `You are a startup idea analyzer. Your job is to read a conversation about a startup idea and create a perfect 2-sentence summary.

CRITICAL RULES:
1. Generate EXACTLY 2 sentences, no more, no less
2. First sentence: Describe WHAT the startup does (the main product/service)
3. Second sentence: Describe the PROBLEM it solves OR the VALUE it provides
4. Be specific and concrete - use details from the conversation
5. Each sentence should be 15-25 words
6. Use professional, clear language
7. Focus on the core business concept, not implementation details

Example format:
"[Product/Service name] is a platform that [main function/feature]. It helps [target users] [solve specific problem/achieve specific goal]."

DO NOT include explanations, just return the 2-sentence summary.`
          },
          {
            role: 'user',
            content: existingSummary
              ? `Update this summary with new information from the recent conversation:\n\n${conversationText}`
              : `Analyze this conversation and create a 2-sentence startup idea summary:\n\n${conversationText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Groq Summary] API error:', response.status, errorText);
      throw new Error(`Groq API failed with status ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content?.trim() || '';
    
    const duration = Date.now() - startTime;
    console.log('[Groq Summary] Generated in', duration, 'ms:', summary);
    
    // Track AI credits usage if user is authenticated
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
            const creditsUsed = 10; // summary generation costs 10 credits
            
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
              operation_type: 'groq-conversation-summary',
              credits_used: creditsUsed,
              billing_period_start: billingPeriodStart,
              billing_period_end: billingPeriodEnd
            });
          }
        }
      } catch (error) {
        console.error('[Groq Summary] Error tracking AI credits:', error);
      }
    }

    // Validate that we got exactly 2 sentences
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length < 2) {
      console.warn('[Groq Summary] Got less than 2 sentences, returning fallback');
      return new Response(
        JSON.stringify({ 
          summary: 'A startup platform focused on innovative solutions. It helps users solve key challenges through technology and innovation.',
          sentences: 2,
          fallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Take only first 2 sentences and reconstruct
    const finalSummary = sentences.slice(0, 2).join('. ') + '.';

    console.log('[Groq Summary] Success - returning summary');
    return new Response(
      JSON.stringify({ 
        summary: finalSummary, 
        sentences: sentences.length,
        duration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Groq Summary] Error after', duration, 'ms:', error);
    
    // Return helpful error message
    const errorMessage = error.name === 'AbortError' 
      ? 'Request timeout - summary generation took too long'
      : error.message || 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        duration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

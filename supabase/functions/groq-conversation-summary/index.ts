import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }

    // Filter and format messages for Groq
    const conversationText = messages
      .filter((m: any) => !m.isTyping && m.content)
      .map((m: any) => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    console.log('[Groq Summary] Processing conversation with', messages.length, 'messages');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: `You are a startup idea analyzer. Your job is to read a conversation about a startup idea and create a perfect 2-sentence summary.

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
            content: `Analyze this conversation and create a 2-sentence startup idea summary:\n\n${conversationText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Groq Summary] API error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content?.trim() || '';

    console.log('[Groq Summary] Generated:', summary);

    // Validate that we got exactly 2 sentences
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length < 2) {
      console.warn('[Groq Summary] Got less than 2 sentences, using fallback');
      return new Response(
        JSON.stringify({ 
          summary: 'A startup platform focused on innovative solutions. It helps users solve key challenges through technology and innovation.',
          sentences: 2
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Take only first 2 sentences and reconstruct
    const finalSummary = sentences.slice(0, 2).join('. ') + '.';

    return new Response(
      JSON.stringify({ summary: finalSummary, sentences: sentences.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Groq Summary] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

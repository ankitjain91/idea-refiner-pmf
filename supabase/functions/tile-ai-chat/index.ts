// Updated to use Groq API instead of Lovable AI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { message, tileData, tileTitle, idea, chatHistory } = await req.json();
    
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    console.log('Tile chat request:', { message, tileTitle, idea, hasTileData: !!tileData });

    // Build context from tile data
    let contextSummary = `Current business idea: "${idea}"\n`;
    contextSummary += `Analyzing: ${tileTitle}\n\n`;
    
    if (tileData) {
      contextSummary += `${tileTitle} Data Context:\n`;
      
      // Handle different tile data structures
      if (tileData.metrics) {
        contextSummary += `Key Metrics:\n`;
        Object.entries(tileData.metrics).forEach(([key, value]) => {
          contextSummary += `- ${key}: ${value}\n`;
        });
      }
      
      if (tileData.trends) {
        contextSummary += `\nTrends:\n`;
        if (Array.isArray(tileData.trends)) {
          tileData.trends.forEach((trend: any) => {
            contextSummary += `- ${trend.name || trend.label}: ${trend.value || trend.description}\n`;
          });
        } else {
          Object.entries(tileData.trends).forEach(([key, value]) => {
            contextSummary += `- ${key}: ${value}\n`;
          });
        }
      }
      
      if (tileData.insights) {
        contextSummary += `\nInsights:\n`;
        if (Array.isArray(tileData.insights)) {
          tileData.insights.forEach((insight: string) => {
            contextSummary += `- ${insight}\n`;
          });
        } else {
          Object.entries(tileData.insights).forEach(([key, value]) => {
            contextSummary += `- ${key}: ${value}\n`;
          });
        }
      }
      
      if (tileData.analysis) {
        contextSummary += `\nAnalysis:\n`;
        Object.entries(tileData.analysis).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            contextSummary += `${key}:\n`;
            value.forEach((item: any) => {
              contextSummary += `  - ${item}\n`;
            });
          } else {
            contextSummary += `- ${key}: ${value}\n`;
          }
        });
      }
      
      // Include any other data
      const handledKeys = ['metrics', 'trends', 'insights', 'analysis'];
      Object.entries(tileData).forEach(([key, value]) => {
        if (!handledKeys.includes(key)) {
          if (typeof value === 'string' || typeof value === 'number') {
            contextSummary += `${key}: ${value}\n`;
          } else if (Array.isArray(value)) {
            contextSummary += `${key}:\n`;
            value.forEach((item: any) => {
              if (typeof item === 'string') {
                contextSummary += `- ${item}\n`;
              } else if (item.name || item.label || item.title) {
                contextSummary += `- ${item.name || item.label || item.title}\n`;
              }
            });
          }
        }
      });
    }

    // Build conversation history
    const messages = [
      {
        role: 'system',
        content: `You are an expert business analyst helping entrepreneurs understand their ${tileTitle} data and derive actionable insights. You have access to detailed data for the user's business idea.

${contextSummary}

Provide actionable, strategic insights based on the data. Be specific and reference actual data points when relevant. Focus on practical advice that can help the user make informed decisions.

Keep responses concise but insightful. Use markdown formatting for better readability.`
      }
    ];

    // Add chat history
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach((msg: any) => {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    console.log('Calling Groq API with messages:', messages.length);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      }
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Groq API configuration.');
      }
      
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';

    console.log('Tile chat response generated successfully');

    // Generate response suggestions
    const suggestionsPrompt = `Based on this ${tileTitle} analysis conversation about "${idea}", suggest 3 brief, specific follow-up questions the user might want to ask next.`;
    
    const suggestionsResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: 'Generate exactly 3 follow-up questions for data analysis discussions. Return ONLY a JSON array of strings like: ["Question 1?", "Question 2?", "Question 3?"]' 
          },
          { 
            role: 'user', 
            content: `Context: ${contextSummary}\n\nLatest Q: ${message}\nLatest A: ${aiResponse}\n\n${suggestionsPrompt}` 
          }
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    let suggestions = [];
    try {
      if (suggestionsResponse.ok) {
        const suggestionsData = await suggestionsResponse.json();
        const suggestionsText = suggestionsData.choices?.[0]?.message?.content;
        if (suggestionsText) {
          // Extract JSON array from the response
          const jsonMatch = suggestionsText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed)) {
              suggestions = parsed.slice(0, 3).filter(s => typeof s === 'string' && s.length > 0);
            }
          }
        }
      }
    } catch (e) {
      console.log('Could not parse suggestions:', e);
    }

    // Fallback suggestions if generation failed
    if (suggestions.length === 0) {
      suggestions = [
        `What are the key trends in this ${tileTitle.toLowerCase()} data?`,
        `How can I improve based on these ${tileTitle.toLowerCase()} insights?`,
        `What actions should I take based on this analysis?`
      ];
    }

    // Track AI credits usage if user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
          
          if (user?.id) {
            const creditsUsed = 25; // tile-ai-chat costs 25 credits
            
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
              operation_type: 'tile-ai-chat',
              credits_used: creditsUsed,
              billing_period_start: billingPeriodStart,
              billing_period_end: billingPeriodEnd
            });
          }
        }
      } catch (error) {
        console.error('[tile-ai-chat] Error tracking AI credits:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        suggestions 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Tile chat error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Centralized environment validation
function validateEnv() {
  const missing: string[] = [];
  if (!GROQ_API_KEY) missing.push('GROQ_API_KEY');
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  
  if (missing.length) {
    console.error('Missing environment variables:', missing);
    return new Response(
      JSON.stringify({ 
        error: `Missing environment variables: ${missing.join(', ')}`, 
        code: 'CONFIG_MISSING'
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  return null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Groq API helper
async function callGroq(messages: any[], maxTokens = 2000) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Groq API error:', error);
    throw new Error(`Groq API error: ${response.status}`);
  }

  return response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const envCheck = validateEnv();
  if (envCheck) return envCheck;

  try {
    const { messages = [], stream = false } = await req.json();

    // Currently disabled - returning mock response
    console.log('Idea chat called with Groq integration');
    
    return new Response(
      JSON.stringify({
        content: "🧠 Welcome to the new Groq-powered brain! I'm running on Llama 3.1 now - faster, smarter, and ready to help you build amazing startups! What's your idea?",
        suggestions: [
          "Tell me about your startup idea",
          "What problem are you solving?",
          "Who is your target customer?",
          "How will you make money?"
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
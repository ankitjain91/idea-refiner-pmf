import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
  const { idea }: { idea?: string } = await req.json();

    if (!idea || idea.length < 4) {
      return new Response(JSON.stringify({ title: 'Idea Session' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!openAIApiKey) {
      // Fallback simple extraction
  const fallback = idea.split(/\s+/).filter(Boolean).slice(0,2).map((w: string)=>w.replace(/[^A-Za-z0-9]/g,'')).join(' ');
      return new Response(JSON.stringify({ title: fallback || 'Idea Session' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `Generate ONLY a concise, brandable, two word Title Case name (no punctuation) for this startup idea: ${idea}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Return only a two word title. No extra text.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 12,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI request failed');
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || '';
  title = title.replace(/[^A-Za-z0-9 \n]/g,' ').split(/\s+/).filter(Boolean).slice(0,2).map((w: string)=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
    if (!title || title.split(' ').length !== 2) {
  const words = idea.split(/\s+/).filter(Boolean).slice(0,2).map((w: string)=>w.replace(/[^A-Za-z0-9]/g,'')).map((w: string)=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase());
      title = words.join(' ') || 'Idea Session';
    }

    return new Response(JSON.stringify({ title }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('generate-session-title error', e);
    return new Response(JSON.stringify({ title: 'Idea Session' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
});

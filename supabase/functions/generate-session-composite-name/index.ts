import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/*
  Input JSON: { transcript: string }
  Output JSON: { title: string }
*/
serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { transcript }: { transcript?: string } = await req.json();
    if (!transcript || transcript.length < 10) {
      return new Response(JSON.stringify({ title: 'Conversation Session' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!openAIApiKey) {
      // Fallback: take top unique significant words
      const words = transcript.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(w=>w.length>3);
      const uniq: string[] = [];
      for (const w of words) { if (!uniq.includes(w)) uniq.push(w); if (uniq.length>=4) break; }
      const title = uniq.map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ') || 'Conversation Session';
      return new Response(JSON.stringify({ title }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `Create ONLY a concise 3 to 5 word Title Case session name summarizing themes of this startup ideation conversation. No punctuation, no quotes. Transcript snippet: ${transcript.slice(0, 4000)}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Return only a title. 5 words max.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 20,
        temperature: 0.6
      })
    });

    if (!response.ok) throw new Error('OpenAI request failed');
    const data = await response.json();
    let title: string = data.choices?.[0]?.message?.content?.trim() || '';
    title = title.replace(/[^A-Za-z0-9 \n]/g,' ').split(/\s+/).filter(Boolean).slice(0,5).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
    if (!title) title = 'Conversation Session';

    return new Response(JSON.stringify({ title }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('generate-session-composite-name error', e);
    return new Response(JSON.stringify({ title: 'Conversation Session' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
});

// deno-lint-ignore-file
// @ts-nocheck
// The above directives suppress local TS errors in non-Deno tooling; Supabase deploy uses Deno runtime types.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing GROQ_API_KEY server env' }), { status: 500, headers: corsHeaders });
    }

    const requestId = crypto.randomUUID();
    const start = Date.now();
    const { idea, businessModel, targetMarket } = await req.json();

    if (!idea || typeof idea !== 'string') {
      return new Response(JSON.stringify({ error: 'Idea is required' }), { status: 400, headers: corsHeaders });
    }

    console.log(`[financial-analysis] (${requestId}) Analyzing financials for:`, idea.slice(0,120));

    const promptSystem = `You are a financial analyst specializing in startups. Analyze the financial potential and unit economics for the given idea. Return ONLY valid JSON (no markdown fences or commentary) matching this TypeScript type:
interface FinancialAnalysis {\n  marketSize: {\n    TAM: { value: number; label: string; description: string };\n    SAM: { value: number; label: string; description: string };\n    SOM: { value: number; label: string; description: string };\n  };\n  unitEconomics: {\n    CAC: { value: number; label: string; trend: string };\n    LTV: { value: number; label: string; trend: string };\n    LTVtoCACRatio: number;\n    paybackPeriod: string;\n    grossMargin: number;\n  };\n  recentFunding: Array<{ company: string; amount: string; stage: string; investors: string[]; date: string; valuation?: string }>;\n  successStories: Array<{ company: string; exit: string; value: string; timeline: string; keyFactors: string[] }>;\n  revenueProjections: { year1: number; year2: number; year3: number; growthRate: number };\n  insights: string[];\n}`;

    const userMessage = `Analyze financials for: "${idea}". Business model: ${businessModel || 'SaaS'}. Target market: ${targetMarket || 'B2B'}. Ensure numeric values are realistic. If uncertain, estimate conservatively.`;

    const body = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: promptSystem },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 2000,
      temperature: 0.4
    };

    const aiResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
      body: JSON.stringify(body)
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error(`[financial-analysis] (${requestId}) Upstream non-200:`, aiResp.status, text.slice(0,500));
      throw new Error(`Upstream AI error ${aiResp.status}`);
    }

    let financialData: any;
    try {
      financialData = await aiResp.json();
    } catch (e) {
      console.error(`[financial-analysis] (${requestId}) JSON parse fail of upstream response`);
      throw new Error('Invalid upstream JSON');
    }

    if (financialData.error) {
      console.error(`[financial-analysis] (${requestId}) Upstream returned error object:`, financialData.error);
      throw new Error(financialData.error.message || 'AI provider error');
    }

    const choice = financialData.choices?.[0];
    if (!choice) {
      console.error(`[financial-analysis] (${requestId}) Missing choices array`, financialData);
      throw new Error('No response from AI analysis');
    }

    let content: string = choice.message?.content || choice.text || '';
    if (!content) {
      console.error(`[financial-analysis] (${requestId}) Empty content in first choice`, choice);
      throw new Error('Empty AI content');
    }

    // Normalize by stripping markdown fences & extraneous text
    content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    // Attempt to extract the first JSON object if extra prose exists
    function extractFirstJsonBlock(raw: string): string | null {
      const firstBrace = raw.indexOf('{');
      if (firstBrace === -1) return null;
      let depth = 0;
      for (let i = firstBrace; i < raw.length; i++) {
        if (raw[i] === '{') depth++;
        else if (raw[i] === '}') {
          depth--;
          if (depth === 0) {
            return raw.slice(firstBrace, i + 1);
          }
        }
      }
      return null;
    }

    let jsonString = content;
    if (!content.trim().startsWith('{')) {
      const extracted = extractFirstJsonBlock(content);
      if (extracted) jsonString = extracted;
    }

    let financials: any;
    try {
      financials = JSON.parse(jsonString);
    } catch (e) {
      console.error(`[financial-analysis] (${requestId}) Failed to parse AI JSON. Raw snippet:`, jsonString.slice(0,400));
      throw new Error('Failed to parse AI JSON');
    }

    // Basic shape validation & fallback defaults
    const ensureNum = (v: any, def: number) => typeof v === 'number' && isFinite(v) ? v : def;
    if (financials.revenueProjections) {
      const rp = financials.revenueProjections;
      rp.year1 = ensureNum(rp.year1, 100000);
      rp.year2 = ensureNum(rp.year2, Math.round(rp.year1 * 3));
      rp.year3 = ensureNum(rp.year3, Math.round(rp.year2 * 3));
      rp.growthRate = ensureNum(rp.growthRate, 300);
    }

    const durationMs = Date.now() - start;
    console.log(`[financial-analysis] (${requestId}) Success in ${durationMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      financials,
      requestId,
      model: body.model,
      elapsedMs: durationMs,
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[financial-analysis] Fatal error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
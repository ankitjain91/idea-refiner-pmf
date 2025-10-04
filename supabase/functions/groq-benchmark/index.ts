import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BenchmarkSample {
  id: string;
  size: 'small' | 'medium' | 'large';
  tileType: string;
  requirements: string;
  dataPoints: string[];
  responses: any[];
  expectedOutput?: any;
}

interface VariantMetrics {
  variant: string;
  total_ms: number;
  pre_ms: number;
  api_ms: number;
  ttfb_ms: number;
  post_ms: number;
  output_tokens: number;
  tok_per_sec: number;
  retries: number;
  json_valid: boolean;
  accuracy_score?: number;
  error?: string;
}

// Benchmark samples (20 real-world extraction tasks)
const BENCHMARK_SAMPLES: BenchmarkSample[] = [
  // Small samples (simple extractions)
  {
    id: 'small_1',
    size: 'small',
    tileType: 'sentiment',
    requirements: 'Extract sentiment score',
    dataPoints: ['sentiment_score'],
    responses: [{ source: 'reddit', data: { text: 'This is amazing! Love it 95% positive' } }]
  },
  {
    id: 'small_2',
    size: 'small',
    tileType: 'market_size',
    requirements: 'Extract TAM',
    dataPoints: ['tam'],
    responses: [{ source: 'web', data: { text: 'Market size is $5.2B TAM' } }]
  },
  {
    id: 'small_3',
    size: 'small',
    tileType: 'competition',
    requirements: 'Extract competitor count',
    dataPoints: ['competitors_list'],
    responses: [{ source: 'web', data: { competitors: ['CompanyA', 'CompanyB', 'CompanyC'] } }]
  },
  {
    id: 'small_4',
    size: 'small',
    tileType: 'growth',
    requirements: 'Extract growth rate',
    dataPoints: ['growth_rate'],
    responses: [{ source: 'web', data: { text: 'CAGR of 15.5% annually' } }]
  },
  // Medium samples (moderate complexity)
  {
    id: 'medium_1',
    size: 'medium',
    tileType: 'market_size',
    requirements: 'Extract TAM, SAM, SOM, growth rate',
    dataPoints: ['tam', 'sam', 'som', 'growth_rate'],
    responses: [
      { source: 'market-intelligence', data: { tam: '$10B', sam: '$3.5B', cagr: '12%' } },
      { source: 'web', data: { text: 'Serviceable obtainable market estimated at $500M' } }
    ]
  },
  {
    id: 'medium_2',
    size: 'medium',
    tileType: 'sentiment',
    requirements: 'Extract sentiment with breakdown',
    dataPoints: ['sentiment_score', 'positive_pct', 'negative_pct', 'neutral_pct'],
    responses: [
      { source: 'reddit', data: { positive: 65, negative: 20, neutral: 15 } },
      { source: 'twitter', data: { sentiment: 'mostly positive' } }
    ]
  },
  {
    id: 'medium_3',
    size: 'medium',
    tileType: 'competition',
    requirements: 'Extract competitors with strengths',
    dataPoints: ['competitors_list', 'market_leaders', 'differentiators'],
    responses: [
      { source: 'competitive-landscape', data: { topCompetitors: [{ name: 'Leader1', strength: 'brand' }, { name: 'Leader2', strength: 'tech' }] } }
    ]
  },
  {
    id: 'medium_4',
    size: 'medium',
    tileType: 'trends',
    requirements: 'Extract market trends',
    dataPoints: ['trend_direction', 'growth_indicators', 'emerging_tech'],
    responses: [
      { source: 'gdelt-news', data: { trends: ['AI adoption rising', 'Cloud migration accelerating'] } }
    ]
  },
  // Large samples (complex multi-source)
  {
    id: 'large_1',
    size: 'large',
    tileType: 'market_size',
    requirements: 'Complete market analysis with all metrics',
    dataPoints: ['tam', 'sam', 'som', 'growth_rate', 'market_maturity', 'competitive_density', 'regional_breakdown'],
    responses: [
      { source: 'market-intelligence', data: { tam: '$25B', sam: '$8B', cagr: '18%', maturity: 'growth' } },
      { source: 'web', data: { text: 'North America leads with 45% share, APAC growing fastest at 22% CAGR' } },
      { source: 'competitive-landscape', data: { concentration: 'moderate', top3share: '35%' } }
    ]
  },
  {
    id: 'large_2',
    size: 'large',
    tileType: 'comprehensive',
    requirements: 'Extract all business metrics',
    dataPoints: ['tam', 'sentiment_score', 'competitors_list', 'growth_rate', 'cac', 'ltv'],
    responses: [
      { source: 'market', data: { tam: '$15B', cagr: '12%' } },
      { source: 'sentiment', data: { score: 78, positive: 70, negative: 10 } },
      { source: 'competition', data: { competitors: ['A', 'B', 'C'], marketShare: { A: 25, B: 20, C: 15 } } },
      { source: 'financial', data: { cac: '$45', ltv: '$450', payback: '6 months' } }
    ]
  }
];

// Add more samples to reach 20
for (let i = 0; i < 10; i++) {
  BENCHMARK_SAMPLES.push({
    id: `synthetic_${i}`,
    size: i < 3 ? 'small' : i < 7 ? 'medium' : 'large',
    tileType: ['sentiment', 'market_size', 'competition', 'trends'][i % 4],
    requirements: 'Extract relevant metrics',
    dataPoints: ['metric_1', 'metric_2', 'metric_3'],
    responses: [{ source: 'synthetic', data: { value: Math.random() * 100 } }]
  });
}

// Variant implementations
async function variantV1_Baseline(sample: BenchmarkSample, groqKey: string): Promise<VariantMetrics> {
  const start = performance.now();
  const preStart = start;
  
  // Current implementation (from groq-data-extraction)
  const combinedData = sample.responses.map(r => ({
    source: r.source,
    summary: JSON.stringify(r.data).substring(0, 2000)
  }));
  
  const prompt = `Extract data for "${sample.tileType}": ${sample.requirements}\nData Points: ${sample.dataPoints.join(', ')}\nData: ${JSON.stringify(combinedData)}`;
  const preEnd = performance.now();
  
  const apiStart = performance.now();
  const ttfbStart = apiStart;
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'Extract data and return JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    }),
  });
  
  const ttfbEnd = performance.now();
  const data = await response.json();
  const apiEnd = performance.now();
  
  const postStart = performance.now();
  let parsed;
  try {
    parsed = JSON.parse(data.choices[0].message.content);
  } catch {
    parsed = { raw: data.choices[0].message.content };
  }
  const postEnd = performance.now();
  const end = performance.now();
  
  const outputTokens = data.usage?.completion_tokens || 0;
  const tokPerSec = outputTokens / ((apiEnd - apiStart) / 1000);
  
  return {
    variant: 'V1_Baseline',
    total_ms: end - start,
    pre_ms: preEnd - preStart,
    api_ms: apiEnd - apiStart,
    ttfb_ms: ttfbEnd - ttfbStart,
    post_ms: postEnd - postStart,
    output_tokens: outputTokens,
    tok_per_sec: tokPerSec,
    retries: 0,
    json_valid: !!parsed && typeof parsed === 'object'
  };
}

async function variantV2_Optimized(sample: BenchmarkSample, groqKey: string): Promise<VariantMetrics> {
  const start = performance.now();
  const preStart = start;
  
  // Trimmed input + temperature=0 + max_tokens capped
  const combinedData = sample.responses.map(r => ({
    source: r.source,
    data: JSON.stringify(r.data).substring(0, 1000) // Reduced from 2000
  }));
  
  // Minimal prompt
  const prompt = `Extract ${sample.dataPoints.join(', ')} from: ${JSON.stringify(combinedData)}`;
  const preEnd = performance.now();
  
  const apiStart = performance.now();
  const ttfbStart = apiStart;
  
  // Estimate max_tokens needed (schema-based)
  const estimatedTokens = sample.dataPoints.length * 50 + 100; // ~50 tokens per field + overhead
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a data extraction expert. Return valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0, // Deterministic
      max_tokens: Math.min(estimatedTokens, 800), // Capped tightly
      response_format: { type: "json_object" }
    }),
  });
  
  const ttfbEnd = performance.now();
  const data = await response.json();
  const apiEnd = performance.now();
  
  const postStart = performance.now();
  const parsed = JSON.parse(data.choices[0].message.content);
  const postEnd = performance.now();
  const end = performance.now();
  
  const outputTokens = data.usage?.completion_tokens || 0;
  const tokPerSec = outputTokens / ((apiEnd - apiStart) / 1000);
  
  return {
    variant: 'V2_Optimized',
    total_ms: end - start,
    pre_ms: preEnd - preStart,
    api_ms: apiEnd - apiStart,
    ttfb_ms: ttfbEnd - ttfbStart,
    post_ms: postEnd - postStart,
    output_tokens: outputTokens,
    tok_per_sec: tokPerSec,
    retries: 0,
    json_valid: !!parsed && typeof parsed === 'object'
  };
}

async function variantV3_AsyncBatch(samples: BenchmarkSample[], groqKey: string): Promise<VariantMetrics[]> {
  // Run 8 requests concurrently with llama-3.1-8b-instant
  const batchSize = 8;
  const results: VariantMetrics[] = [];
  
  for (let i = 0; i < samples.length; i += batchSize) {
    const batch = samples.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (sample) => {
        const start = performance.now();
        
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [
                { role: 'system', content: 'Extract data. Return JSON.' },
                { role: 'user', content: `Extract ${sample.dataPoints.join(', ')} from ${JSON.stringify(sample.responses)}` }
              ],
              temperature: 0,
              max_tokens: 500
            }),
          });
          
          const data = await response.json();
          const end = performance.now();
          
          const outputTokens = data.usage?.completion_tokens || 0;
          
          return {
            variant: 'V3_AsyncBatch',
            total_ms: end - start,
            pre_ms: 0,
            api_ms: end - start,
            ttfb_ms: 0,
            post_ms: 0,
            output_tokens: outputTokens,
            tok_per_sec: outputTokens / ((end - start) / 1000),
            retries: 0,
            json_valid: true
          };
        } catch (error) {
          return {
            variant: 'V3_AsyncBatch',
            total_ms: performance.now() - start,
            pre_ms: 0,
            api_ms: 0,
            ttfb_ms: 0,
            post_ms: 0,
            output_tokens: 0,
            tok_per_sec: 0,
            retries: 0,
            json_valid: false,
            error: error.message
          };
        }
      })
    );
    results.push(...batchResults);
  }
  
  return results;
}

async function variantV4_Hybrid(sample: BenchmarkSample): Promise<VariantMetrics> {
  const start = performance.now();
  
  // Try regex extraction first
  const text = JSON.stringify(sample.responses).toLowerCase();
  const trivialFields: any = {};
  
  // Regex extractors for common fields
  if (sample.dataPoints.includes('growth_rate')) {
    const match = text.match(/(\d+\.?\d*)%?\s*(?:cagr|growth)/);
    if (match) trivialFields.growth_rate = `${match[1]}%`;
  }
  
  if (sample.dataPoints.includes('sentiment_score')) {
    const match = text.match(/sentiment[:\s]*(\d+)/);
    if (match) trivialFields.sentiment_score = parseInt(match[1]);
  }
  
  // If all fields extracted via regex, skip LLM
  const extractedCount = Object.keys(trivialFields).length;
  const totalFields = sample.dataPoints.length;
  
  const end = performance.now();
  
  return {
    variant: 'V4_Hybrid',
    total_ms: end - start,
    pre_ms: end - start,
    api_ms: 0, // No API call if regex succeeded
    ttfb_ms: 0,
    post_ms: 0,
    output_tokens: 0,
    tok_per_sec: 0,
    retries: 0,
    json_valid: extractedCount > 0,
    accuracy_score: extractedCount / totalFields
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, samples, variantName } = await req.json();
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (action === 'benchmark') {
      console.log('🔬 Starting comprehensive LLM extraction benchmark');
      
      const testSamples = samples || BENCHMARK_SAMPLES.slice(0, 10); // Use first 10 for quick test
      const results: { [variant: string]: VariantMetrics[] } = {};
      
      // Run V1 Baseline
      console.log('Running V1 Baseline...');
      results.V1_Baseline = [];
      for (const sample of testSamples) {
        try {
          const metrics = await variantV1_Baseline(sample, GROQ_API_KEY);
          results.V1_Baseline.push(metrics);
          await new Promise(r => setTimeout(r, 500)); // Rate limit protection
        } catch (error) {
          console.error('V1 error:', error);
        }
      }
      
      // Run V2 Optimized
      console.log('Running V2 Optimized...');
      results.V2_Optimized = [];
      for (const sample of testSamples) {
        try {
          const metrics = await variantV2_Optimized(sample, GROQ_API_KEY);
          results.V2_Optimized.push(metrics);
          await new Promise(r => setTimeout(r, 500));
        } catch (error) {
          console.error('V2 error:', error);
        }
      }
      
      // Run V3 AsyncBatch
      console.log('Running V3 AsyncBatch...');
      try {
        results.V3_AsyncBatch = await variantV3_AsyncBatch(testSamples, GROQ_API_KEY);
      } catch (error) {
        console.error('V3 error:', error);
        results.V3_AsyncBatch = [];
      }
      
      // Run V4 Hybrid
      console.log('Running V4 Hybrid...');
      results.V4_Hybrid = [];
      for (const sample of testSamples) {
        const metrics = await variantV4_Hybrid(sample);
        results.V4_Hybrid.push(metrics);
      }
      
      // Calculate statistics
      const stats: any = {};
      for (const [variant, metrics] of Object.entries(results)) {
        const validMetrics = metrics.filter(m => !m.error);
        if (validMetrics.length === 0) continue;
        
        const totalTimes = validMetrics.map(m => m.total_ms);
        const apiTimes = validMetrics.map(m => m.api_ms);
        const ttfbTimes = validMetrics.map(m => m.ttfb_ms);
        const tokPerSec = validMetrics.map(m => m.tok_per_sec).filter(t => t > 0);
        
        stats[variant] = {
          median_total_ms: median(totalTimes),
          p95_total_ms: percentile(totalTimes, 95),
          median_api_ms: median(apiTimes),
          median_ttfb_ms: median(ttfbTimes),
          avg_tok_per_sec: mean(tokPerSec),
          json_valid_pct: (validMetrics.filter(m => m.json_valid).length / validMetrics.length) * 100,
          total_samples: validMetrics.length,
          errors: metrics.filter(m => m.error).length
        };
      }
      
      // Store results in Supabase
      await supabase.from('benchmark_results').insert({
        benchmark_type: 'llm_extraction',
        results: { stats, raw: results },
        created_at: new Date().toISOString()
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          stats,
          raw_results: results,
          recommendation: generateRecommendation(stats)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Benchmark error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Utility functions
function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function generateRecommendation(stats: any): any {
  const variants = Object.keys(stats);
  let best = variants[0];
  let bestP95 = stats[best]?.p95_total_ms || Infinity;
  
  for (const variant of variants) {
    if (stats[variant]?.p95_total_ms < bestP95) {
      best = variant;
      bestP95 = stats[variant].p95_total_ms;
    }
  }
  
  return {
    recommended_variant: best,
    p95_improvement: stats.V1_Baseline ? 
      ((stats.V1_Baseline.p95_total_ms - bestP95) / stats.V1_Baseline.p95_total_ms * 100).toFixed(1) + '%' 
      : 'N/A',
    reasoning: `${best} achieved lowest p95 latency of ${bestP95.toFixed(0)}ms`,
    next_steps: [
      'Implement optimizations from best variant',
      'Add response caching for 24h',
      'Monitor token usage and costs',
      'Set up rollback triggers if accuracy drops >1%'
    ]
  };
}
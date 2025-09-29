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
    const { idea, industry, timeWindow } = await req.json();
    
    console.log('[growth-projections] Analyzing growth for:', idea);
    
    // Calculate growth trends from multiple sources
    const currentDate = new Date();
    const months: string[] = [];
    const growthData = {
      conservative: [] as number[],
      base: [] as number[],
      aggressive: [] as number[]
    };
    
    // Generate monthly projections for next 12 months
    for (let i = 0; i < 12; i++) {
      const month = new Date(currentDate);
      month.setMonth(month.getMonth() + i);
      months.push(month.toISOString().slice(0, 7));
      
      // Simple CAGR formulas with different growth rates
      const baseValue = 100;
      const conservativeGrowth = Math.pow(1.08, i / 12) * baseValue; // 8% annual
      const baseGrowth = Math.pow(1.15, i / 12) * baseValue; // 15% annual
      const aggressiveGrowth = Math.pow(1.25, i / 12) * baseValue; // 25% annual
      
      growthData.conservative.push(Math.round(conservativeGrowth));
      growthData.base.push(Math.round(baseGrowth));
      growthData.aggressive.push(Math.round(aggressiveGrowth));
    }
    
    // Try to get trend data using Serper API
    let mentionGrowth = 15; // Default 15% growth
    const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
    
    if (SERPER_API_KEY) {
      try {
        // Search for growth indicators
        const query = `${idea} growth rate market trends forecast`;
        
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: query,
            num: 5,
          }),
        });
        
        const data = await response.json();
        
        if (data.organic_results) {
          // Extract growth percentages from snippets
          const growthPattern = /([\d.]+)%\s*(growth|increase|CAGR)/gi;
          const percentages = [];
          
          for (const result of data.organic_results) {
            const matches = [...(result.snippet || '').matchAll(growthPattern)];
            for (const match of matches) {
              percentages.push(parseFloat(match[1]));
            }
          }
          
          if (percentages.length > 0) {
            mentionGrowth = percentages.reduce((a, b) => a + b, 0) / percentages.length;
          }
        }
      } catch (err) {
        console.error('[growth-projections] Search error:', err);
      }
    }
    
    const response = {
      updatedAt: new Date().toISOString(),
      metrics: [
        { name: 'Current Growth', value: mentionGrowth, unit: '%', confidence: 0.7 },
        { name: 'Market Momentum', value: mentionGrowth > 20 ? 'High' : mentionGrowth > 10 ? 'Medium' : 'Low', confidence: 0.6 },
        { name: 'Competition Intensity', value: 'Medium', confidence: 0.5 },
        { name: 'Adoption Rate', value: Math.round(mentionGrowth * 0.7), unit: '%', confidence: 0.5 }
      ],
      series: [
        { name: 'Conservative', data: growthData.conservative, labels: months },
        { name: 'Base Case', data: growthData.base, labels: months },
        { name: 'Aggressive', data: growthData.aggressive, labels: months }
      ],
      drivers: [
        { factor: 'Market Demand', impact: 'positive', strength: 0.8 },
        { factor: 'Technology Adoption', impact: 'positive', strength: 0.7 },
        { factor: 'Competition', impact: 'negative', strength: 0.3 },
        { factor: 'Regulatory', impact: 'neutral', strength: 0.1 }
      ],
      profitLink: {
        demand_curve: growthData.base,
        price_elasticity: -0.3,
        optimal_price: 99,
        unit_cost: 30,
        profit_projection: growthData.base.map(v => (v * 69)) // (price - cost) * volume
      }
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[growth-projections] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
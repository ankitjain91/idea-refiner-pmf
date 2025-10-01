import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegionData {
  region: string;
  TAM: string;
  SAM: string;
  SOM: string;
  growth: string;
  confidence: string;
}

interface MarketSizeData {
  TAM: string;
  SAM: string;
  SOM: string;
  growth_rate: string;
  regions: RegionData[];
  confidence: string;
  explanation: string;
  citations: any[];
  charts: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, geo_scope = [], audience_profiles = [], competitors = [] } = await req.json();
    
    if (!idea) {
      throw new Error('Idea is required');
    }

    console.log(`Starting market size analysis for: ${idea}`);
    
    // Fetch data from multiple sources
    const serperKey = Deno.env.get('SERPER_API_KEY');
    const groqKey = Deno.env.get('GROQ_API_KEY');
    
    // Build search queries for market data
    const searchQueries = [
      `${idea} market size TAM total addressable market billions`,
      `${idea} industry market analysis revenue projections CAGR`,
      `${idea} market forecast growth rate 2025 2030`,
      ...geo_scope.map(geo => `${idea} market size ${geo} revenue`),
      ...competitors.map(comp => `${comp} revenue market share valuation`)
    ];

    // Execute searches in parallel
    const searchPromises = searchQueries.slice(0, 5).map(async (query) => {
      try {
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            q: query,
            num: 10,
            gl: 'us',
            hl: 'en'
          }),
        });
        
        if (!response.ok) {
          console.error(`Search failed for query: ${query}`);
          return null;
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Search error for query ${query}:`, error);
        return null;
      }
    });

    const searchResults = await Promise.all(searchPromises);
    const validResults = searchResults.filter(r => r !== null);

    // Extract market size data from search results
    const marketDataPoints: any[] = [];
    const sources: any[] = [];
    
    validResults.forEach(result => {
      if (result?.organic) {
        result.organic.forEach((item: any) => {
          // Extract numbers from snippets
          const snippet = item.snippet || '';
          const title = item.title || '';
          
          // Look for market size indicators
          const billionMatch = snippet.match(/\$?([\d.]+)\s*[Bb]illion/g);
          const trillionMatch = snippet.match(/\$?([\d.]+)\s*[Tt]rillion/g);
          const cagrMatch = snippet.match(/([\d.]+)%\s*CAGR/gi);
          const growthMatch = snippet.match(/([\d.]+)%\s*(growth|increase|expand)/gi);
          
          if (billionMatch || trillionMatch || cagrMatch) {
            marketDataPoints.push({
              source: item.title,
              url: item.link,
              snippet: snippet.substring(0, 200),
              billions: billionMatch ? parseFloat(billionMatch[0].replace(/[^\d.]/g, '')) : 0,
              trillions: trillionMatch ? parseFloat(trillionMatch[0].replace(/[^\d.]/g, '')) * 1000 : 0,
              cagr: cagrMatch ? parseFloat(cagrMatch[0].replace(/[^\d.]/g, '')) : null,
              growth: growthMatch ? parseFloat(growthMatch[0].replace(/[^\d.]/g, '')) : null
            });
            
            sources.push({
              url: item.link,
              title: item.title,
              snippet: snippet.substring(0, 150) + '...'
            });
          }
        });
      }
    });

    // Use Groq to synthesize the data
    let analysisResult: MarketSizeData;
    
    if (groqKey && marketDataPoints.length > 0) {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [
            {
              role: 'system',
              content: `You are a market analyst. Synthesize market data into a structured JSON response.
                
                CRITICAL: You must return ONLY valid JSON with this exact structure:
                {
                  "TAM": "$XB",
                  "SAM": "$XB", 
                  "SOM": "$XB",
                  "growth_rate": "X% CAGR (2025-2030)",
                  "regions": [
                    {"region": "North America", "TAM": "$XB", "SAM": "$XB", "SOM": "$XB", "growth": "X%", "confidence": "High"},
                    {"region": "Europe", "TAM": "$XB", "SAM": "$XB", "SOM": "$XB", "growth": "X%", "confidence": "Moderate"},
                    {"region": "APAC", "TAM": "$XB", "SAM": "$XB", "SOM": "$XB", "growth": "X%", "confidence": "Moderate"}
                  ],
                  "confidence": "High",
                  "explanation": "TAM derived from...",
                  "citations": [],
                  "charts": []
                }
                
                Rules:
                - TAM = Total Addressable Market (100% market capture)
                - SAM = 30-40% of TAM (serviceable portion)
                - SOM = 5-10% of SAM (realistic capture in 5 years)
                - Use the highest credible values from the data
                - Distribute regionally: NA=40-50%, Europe=25-30%, APAC=20-30%
                - Growth rates should be between 5-25% CAGR`
            },
            {
              role: 'user',
              content: `Analyze market size for "${idea}" based on this data:
                ${JSON.stringify(marketDataPoints.slice(0, 10), null, 2)}
                
                Geographic scope: ${geo_scope.join(', ') || 'Global'}
                Target audience: ${audience_profiles.join(', ') || 'General market'}
                
                Provide realistic market sizing with clear explanations.`
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        let content = groqData.choices[0]?.message?.content || '';
        
        // Clean up the response - remove markdown code blocks if present
        if (content.includes('```json')) {
          content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        } else if (content.includes('```')) {
          content = content.replace(/```\s*/g, '');
        }
        
        // Trim whitespace
        content = content.trim();
        
        try {
          analysisResult = JSON.parse(content);
          console.log('Successfully parsed Groq market analysis');
        } catch (parseError) {
          console.error('Failed to parse Groq response:', parseError);
          console.log('Raw content:', content.substring(0, 500));
          // Fallback to calculation
          analysisResult = calculateMarketSize(marketDataPoints);
        }
      } else {
        console.error('Groq API returned error:', groqResponse.status);
        analysisResult = calculateMarketSize(marketDataPoints);
      }
    } else {
      analysisResult = calculateMarketSize(marketDataPoints);
    }

    // Add charts configuration
    analysisResult.charts = [
      {
        type: 'waterfall',
        series: [
          { name: 'TAM', value: parseFloat(analysisResult.TAM.replace(/[^\d.]/g, '')) },
          { name: 'SAM', value: parseFloat(analysisResult.SAM.replace(/[^\d.]/g, '')) },
          { name: 'SOM', value: parseFloat(analysisResult.SOM.replace(/[^\d.]/g, '')) }
        ]
      },
      {
        type: 'map',
        series: analysisResult.regions.map(r => ({
          region: r.region,
          TAM: parseFloat(r.TAM.replace(/[^\d.]/g, '')),
          SAM: parseFloat(r.SAM.replace(/[^\d.]/g, '')),
          SOM: parseFloat(r.SOM.replace(/[^\d.]/g, '')),
          growth: parseFloat(r.growth.replace(/[^\d.]/g, ''))
        }))
      },
      {
        type: 'line',
        series: generateGrowthProjection(
          parseFloat(analysisResult.SOM.replace(/[^\d.]/g, '')),
          parseFloat(analysisResult.growth_rate.replace(/[^\d.]/g, ''))
        )
      }
    ];

    // Add top citations
    analysisResult.citations = sources.slice(0, 5);

    console.log('Market analysis complete:', {
      TAM: analysisResult.TAM,
      SAM: analysisResult.SAM,
      SOM: analysisResult.SOM,
      dataPoints: marketDataPoints.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        market_size: analysisResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Market size analysis error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Market analysis failed',
        market_size: getFallbackMarketSize()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

function calculateMarketSize(dataPoints: any[]): MarketSizeData {
  // Extract and average market values
  const marketValues = dataPoints
    .map(dp => dp.billions + dp.trillions)
    .filter(v => v > 0)
    .sort((a, b) => b - a);
    
  const avgMarket = marketValues.length > 0 
    ? marketValues.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, marketValues.length)
    : 50; // Default $50B if no data
    
  const growthRates = dataPoints
    .map(dp => dp.cagr || dp.growth)
    .filter(v => v !== null && v > 0 && v < 100);
    
  const avgGrowth = growthRates.length > 0
    ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
    : 12; // Default 12% CAGR

  const tam = Math.round(avgMarket * 10) / 10;
  const sam = Math.round(tam * 0.35 * 10) / 10;
  const som = Math.round(sam * 0.08 * 10) / 10;

  return {
    TAM: `$${tam}B`,
    SAM: `$${sam}B`,
    SOM: `$${som}B`,
    growth_rate: `${Math.round(avgGrowth)}% CAGR (2025-2030)`,
    regions: [
      {
        region: "North America",
        TAM: `$${(tam * 0.45).toFixed(1)}B`,
        SAM: `$${(sam * 0.45).toFixed(1)}B`,
        SOM: `$${(som * 0.45).toFixed(1)}B`,
        growth: `${Math.round(avgGrowth * 0.8)}%`,
        confidence: "High"
      },
      {
        region: "Europe",
        TAM: `$${(tam * 0.28).toFixed(1)}B`,
        SAM: `$${(sam * 0.28).toFixed(1)}B`,
        SOM: `$${(som * 0.28).toFixed(1)}B`,
        growth: `${Math.round(avgGrowth * 0.9)}%`,
        confidence: "Moderate"
      },
      {
        region: "APAC",
        TAM: `$${(tam * 0.27).toFixed(1)}B`,
        SAM: `$${(sam * 0.27).toFixed(1)}B`,
        SOM: `$${(som * 0.27).toFixed(1)}B`,
        growth: `${Math.round(avgGrowth * 1.4)}%`,
        confidence: "Moderate"
      }
    ],
    confidence: dataPoints.length > 5 ? "High" : dataPoints.length > 2 ? "Moderate" : "Low",
    explanation: `TAM of $${tam}B derived from ${dataPoints.length} market data points. SAM represents serviceable market (35% of TAM). SOM estimates realistic 5-year capture (8% of SAM) based on competition and growth rates.`,
    citations: [],
    charts: []
  };
}

function generateGrowthProjection(startValue: number, cagr: number): any[] {
  const years = 5;
  const projection = [];
  
  for (let i = 0; i <= years; i++) {
    projection.push({
      year: 2025 + i,
      value: startValue * Math.pow(1 + cagr/100, i),
      label: `$${(startValue * Math.pow(1 + cagr/100, i)).toFixed(1)}B`
    });
  }
  
  return projection;
}

function getFallbackMarketSize(): MarketSizeData {
  return {
    TAM: "$75B",
    SAM: "$25B",
    SOM: "$2B",
    growth_rate: "15% CAGR (2025-2030)",
    regions: [
      {
        region: "North America",
        TAM: "$35B",
        SAM: "$12B",
        SOM: "$1B",
        growth: "12%",
        confidence: "Moderate"
      },
      {
        region: "Europe",
        TAM: "$20B",
        SAM: "$7B",
        SOM: "$0.5B",
        growth: "14%",
        confidence: "Moderate"
      },
      {
        region: "APAC",
        TAM: "$20B",
        SAM: "$6B",
        SOM: "$0.5B",
        growth: "20%",
        confidence: "Moderate"
      }
    ],
    confidence: "Low",
    explanation: "Estimated based on industry benchmarks. Actual values may vary significantly.",
    citations: [],
    charts: []
  };
}
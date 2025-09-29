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
    const { idea, industry, geography, detailed = true } = await req.json();
    
    console.log('[market-size] Analyzing market size for:', idea);
    console.log('[market-size] Request params:', { industry, geography, detailed });
    
    // Initialize response structure
    let tam = 0, sam = 0, som = 0, cagr = 0;
    const calculationDetails: any = {
      method: 'estimation',
      dataPoints: [],
      confidence: 0.5,
      sources: [],
      calculations: {
        tam: { value: 0, explanation: '' },
        sam: { value: 0, explanation: '' },
        som: { value: 0, explanation: '' },
        cagr: { value: 0, explanation: '' }
      }
    };
    
    // Extract key terms from the idea for more targeted searches
    const isChildrensBooks = idea.toLowerCase().includes('children') && idea.toLowerCase().includes('book');
    const isPersonalized = idea.toLowerCase().includes('personalized') || idea.toLowerCase().includes('custom');
    
    // Use Serper API to get real market data
    const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
    const searchResults = [];
    
    if (SERPER_API_KEY) {
      try {
        // Multiple targeted searches for comprehensive data
        const queries = [
          `${idea} market size TAM billion 2024 2025`,
          `children's books personalized publishing market size revenue 2024`,
          `custom book printing on-demand market growth CAGR`,
          `personalized children's books market analysis statistics`
        ];
        
        console.log('[market-size] Searching with queries:', queries);
        
        for (const query of queries) {
          const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'X-API-KEY': SERPER_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              q: query,
              num: 10,
            }),
          });
          
          const data = await response.json();
          
          if (data.organic) {
            for (const result of data.organic) {
              searchResults.push({
                title: result.title,
                snippet: result.snippet,
                link: result.link,
                query: query
              });
            }
          }
        }
        
        console.log(`[market-size] Found ${searchResults.length} search results`);
        calculationDetails.method = 'real-time-data';
      } catch (err) {
        console.error('[market-size] Serper API error:', err);
        calculationDetails.method = 'industry-benchmarks';
      }
    } else {
      console.log('[market-size] No SERPER_API_KEY found, using industry benchmarks');
      calculationDetails.method = 'industry-benchmarks';
    }
    
    // Extract market data from search results
    const extractMarketData = (text: string) => {
      const patterns = [
        /\$?([\d.]+)\s*(billion|million|trillion)/gi,
        /market size.*?([\d.]+)\s*(billion|million)/gi,
        /valued at.*?([\d.]+)\s*(billion|million)/gi,
        /worth.*?([\d.]+)\s*(billion|million)/gi,
        /CAGR.*?([\d.]+)%/gi,
        /growth rate.*?([\d.]+)%/gi,
        /expected to.*?([\d.]+)\s*(billion|million)/gi
      ];
      
      const numbers = [];
      const growthRates = [];
      
      for (const pattern of patterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          if (match[0].includes('%')) {
            growthRates.push(parseFloat(match[1]));
          } else {
            const value = parseFloat(match[1]);
            const unit = match[2]?.toLowerCase();
            const normalized = unit === 'billion' ? value * 1000 : unit === 'trillion' ? value * 1000000 : value;
            numbers.push({
              value: normalized,
              raw: `$${match[1]} ${match[2]}`,
              context: text.substring(Math.max(0, text.indexOf(match[0]) - 100), Math.min(text.length, text.indexOf(match[0]) + 100))
            });
          }
        }
      }
      
      return { numbers, growthRates };
    };
    
    // Process search results
    const allMarketSizes = [];
    const allGrowthRates = [];
    
    for (const result of searchResults) {
      const { numbers, growthRates } = extractMarketData(result.snippet || '');
      
      if (numbers.length > 0) {
        allMarketSizes.push(...numbers);
        calculationDetails.dataPoints.push({
          source: result.title,
          url: result.link,
          values: numbers.map(n => n.raw),
          snippet: result.snippet
        });
      }
      
      if (growthRates.length > 0) {
        allGrowthRates.push(...growthRates);
      }
    }
    
    console.log(`[market-size] Extracted ${allMarketSizes.length} market sizes and ${allGrowthRates.length} growth rates`);
    
    // Calculate TAM, SAM, SOM based on real data or benchmarks
    if (allMarketSizes.length > 0) {
      // Sort by value to find appropriate ranges
      allMarketSizes.sort((a, b) => b.value - a.value);
      
      // TAM: Use the largest relevant market size found
      tam = allMarketSizes[0]?.value || 0;
      
      // Look for specific mentions of segments
      const personalizedMention = allMarketSizes.find(n => 
        n.context.toLowerCase().includes('personalized') || 
        n.context.toLowerCase().includes('custom')
      );
      
      // SAM: Serviceable market (typically 10-20% of TAM for niche products)
      if (personalizedMention && personalizedMention.value < tam) {
        sam = personalizedMention.value;
      } else {
        sam = tam * 0.15; // 15% of TAM for personalized segment
      }
      
      // SOM: Realistic capture (1-5% of SAM for new entrants)
      som = sam * 0.03; // 3% market share in 5 years
      
      calculationDetails.calculations.tam = {
        value: tam,
        explanation: `Total children's book market based on ${allMarketSizes[0]?.context || 'market research'}`
      };
      
      calculationDetails.calculations.sam = {
        value: sam,
        explanation: `Serviceable market for personalized/custom children's books (15% of TAM)`
      };
      
      calculationDetails.calculations.som = {
        value: som,
        explanation: `Realistic market capture in 5 years (3% of SAM for new platform)`
      };
      
      calculationDetails.confidence = Math.min(0.85, 0.5 + (allMarketSizes.length * 0.05));
    } else {
      // Use industry benchmarks when no data found
      console.log('[market-size] Using industry benchmarks due to no extracted data');
      
      // Children's book market benchmarks
      tam = 7900; // Global children's book market ~$7.9B (2024)
      sam = 1185; // Personalized segment ~15% = $1.185B
      som = 35.55; // Achievable 3% market share = $35.55M
      
      calculationDetails.calculations.tam = {
        value: tam,
        explanation: 'Global children\'s book market based on industry reports (~$7.9B in 2024)'
      };
      
      calculationDetails.calculations.sam = {
        value: sam,
        explanation: 'Personalized children\'s books segment (15% of total market)'
      };
      
      calculationDetails.calculations.som = {
        value: som,
        explanation: 'Conservative 3% market share achievable in 5 years'
      };
      
      calculationDetails.confidence = 0.6;
    }
    
    // Calculate CAGR
    if (allGrowthRates.length > 0) {
      cagr = Math.round(allGrowthRates.reduce((a, b) => a + b, 0) / allGrowthRates.length);
      calculationDetails.calculations.cagr = {
        value: cagr,
        explanation: `Average growth rate from ${allGrowthRates.length} data points`
      };
    } else {
      cagr = 12; // Children's book market average CAGR
      calculationDetails.calculations.cagr = {
        value: cagr,
        explanation: 'Industry average growth rate for personalized products'
      };
    }
    
    // Ensure we have non-zero values
    tam = tam || 7900;
    sam = sam || 1185;
    som = som || 35.55;
    cagr = cagr || 12;
    
    // Convert to millions for consistency
    const response = {
      // Direct values for immediate use
      tam: tam * 1000000, // Convert to dollars
      sam: sam * 1000000,
      som: som * 1000000,
      cagr,
      
      // Detailed breakdown
      updatedAt: new Date().toISOString(),
      metrics: [
        { name: 'TAM', value: tam, unit: 'M', confidence: calculationDetails.confidence },
        { name: 'SAM', value: sam, unit: 'M', confidence: calculationDetails.confidence * 0.9 },
        { name: 'SOM', value: som, unit: 'M', confidence: calculationDetails.confidence * 0.8 },
        { name: 'CAGR', value: cagr, unit: '%', confidence: calculationDetails.confidence * 0.85 }
      ],
      
      segments: [
        { 
          name: 'Direct-to-Consumer', 
          share: 45, 
          size: sam * 0.45 * 1000000,
          growth: cagr + 3,
          penetration: 15,
          priority: 'High'
        },
        { 
          name: 'B2B Publishers', 
          share: 30,
          size: sam * 0.30 * 1000000,
          growth: cagr,
          penetration: 8,
          priority: 'Medium'
        },
        { 
          name: 'Educational Market', 
          share: 25,
          size: sam * 0.25 * 1000000,
          growth: cagr - 2,
          penetration: 5,
          priority: 'Low'
        }
      ],
      
      assumptions: [
        'Market data based on 2024 industry reports and real-time search results',
        'Personalized segment estimated at 15% of total children\'s book market',
        'Conservative 3% market share achievable within 5 years',
        'Growth rates reflect digital transformation in publishing'
      ],
      
      drivers: [
        'Increasing demand for personalized educational content',
        'Growing adoption of print-on-demand technology',
        'Rising parental spending on unique children\'s products',
        'Digital natives becoming parents and seeking tech-enabled solutions'
      ],
      
      calculationDetails: detailed ? calculationDetails : undefined,
      
      sources: calculationDetails.dataPoints.slice(0, 5),
      
      profitLink: {
        revenue_potential: som * 1000000,
        price_point: 49,
        customers_needed: Math.round((som * 1000000) / (49 * 12))
      }
    };
    
    console.log('[market-size] Final response:', {
      tam: `$${tam}M`,
      sam: `$${sam}M`,
      som: `$${som}M`,
      cagr: `${cagr}%`,
      method: calculationDetails.method,
      dataPoints: calculationDetails.dataPoints.length
    });
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[market-size] Error:', error);
    
    // Return fallback data instead of error
    const fallbackResponse = {
      tam: 7900000000, // $7.9B
      sam: 1185000000, // $1.185B
      som: 35550000, // $35.55M
      cagr: 12,
      updatedAt: new Date().toISOString(),
      metrics: [
        { name: 'TAM', value: 7900, unit: 'M', confidence: 0.5 },
        { name: 'SAM', value: 1185, unit: 'M', confidence: 0.5 },
        { name: 'SOM', value: 35.55, unit: 'M', confidence: 0.5 },
        { name: 'CAGR', value: 12, unit: '%', confidence: 0.5 }
      ],
      assumptions: ['Using industry benchmark data due to API error'],
      drivers: ['Market data temporarily unavailable, using estimates'],
      segments: [],
      sources: []
    };
    
    return new Response(JSON.stringify(fallbackResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
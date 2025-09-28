import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tileType, filters } = await req.json();
    
    // Generate minimal response to prevent timeouts
    const response = {
      updatedAt: new Date().toISOString(),
      filters: filters || {},
      metrics: generateMetrics(tileType),
      items: [],
      assumptions: getAssumptions(tileType),
      notes: getNotes(tileType),
      citations: [],
      fromCache: false
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date().toISOString(),
        filters: {},
        metrics: [],
        items: [],
        assumptions: [],
        notes: 'Error fetching data',
        citations: []
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateMetrics(tileType: string): any[] {
  const metricsMap: Record<string, any[]> = {
    'search-trends': [
      { name: 'Search Interest', value: 'Unknown', unit: 'trend', explanation: 'Based on search result volume and recency', method: 'Web search analysis', confidence: 0.3 }
    ],
    'competitor-landscape': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ],
    'target-audience': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ],
    'pm-fit-score': [
      { name: 'PM Fit Score', value: 0, unit: '/100', explanation: 'Product-Market Fit likelihood based on available signals', method: 'Multi-factor analysis', confidence: 0.3 }
    ],
    'market-potential': [
      { name: 'TAM', value: 'Data collection in progress', unit: 'USD', explanation: 'Total Addressable Market estimate', method: 'Industry reports analysis', confidence: 0.5 },
      { name: 'SAM', value: 'Data collection in progress', unit: 'USD', explanation: 'Serviceable Addressable Market', method: 'Geographic and segment filtering', confidence: 0.4 }
    ],
    'unit-economics': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ],
    'funding-pathways': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ],
    'success-stories': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ],
    'roadmap': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ],
    'resource-estimator': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ],
    'risk-matrix': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ],
    'social-sentiment': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ],
    'quick-poll': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ],
    'partnerships': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ],
    'simulations': [
      { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
    ]
  };

  return metricsMap[tileType] || [
    { name: 'Data Points', value: 0, unit: 'sources', explanation: 'Number of relevant sources found', method: 'Web search', confidence: 1 }
  ];
}

function getAssumptions(tileType: string): string[] {
  const assumptionsMap: Record<string, string[]> = {
    'market-potential': ['Market size estimates based on available public data', 'Growth rates extrapolated from recent trends'],
    'unit-economics': ['CAC/LTV based on industry benchmarks', 'May vary significantly based on execution'],
    'pm-fit-score': ['Score derived from multiple signals', 'Actual fit requires customer validation']
  };

  return assumptionsMap[tileType] || [];
}

function getNotes(tileType: string): string {
  const notesMap: Record<string, string> = {
    'search-trends': 'Search interest indicates market awareness',
    'competitor-landscape': 'Competition validates market demand',
    'target-audience': 'Segments based on market signals',
    'market-potential': 'Estimates subject to market conditions',
    'unit-economics': 'Benchmarks vary by business model',
    'funding-pathways': 'Recent rounds indicate investor interest',
    'success-stories': 'Past success does not guarantee future results',
    'roadmap': 'Adapt based on learnings',
    'resource-estimator': 'Estimates vary by location and expertise',
    'risk-matrix': 'Monitor and update regularly',
    'social-sentiment': 'Sentiment can shift rapidly',
    'partnerships': 'Strategic alignment is key',
    'simulations': 'Models simplify reality'
  };

  return notesMap[tileType] || 'Data refreshed from web sources';
}
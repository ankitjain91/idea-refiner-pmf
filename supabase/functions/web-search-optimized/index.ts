import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { filters } = await req.json();
    
    console.log('Web search optimized disabled - returning placeholder data');

    // Return a disabled message
    const responseData = {
      updatedAt: new Date().toISOString(),
      filters,
      tiles: {
        'search-trends': {
          metrics: [],
          items: [],
          notes: "OpenAI integration has been disabled"
        },
        'competitor-landscape': {
          metrics: [],
          competitors: [],
          notes: "OpenAI integration has been disabled"
        },
        'target-audience': {
          metrics: [],
          demographics: {},
          notes: "OpenAI integration has been disabled"
        },
        'pm-fit-score': {
          metrics: [],
          signals: [],
          notes: "OpenAI integration has been disabled"
        },
        'market-potential': {
          metrics: [],
          notes: "OpenAI integration has been disabled"
        },
        'unit-economics': {
          metrics: [],
          notes: "OpenAI integration has been disabled"
        },
        'risk-matrix': {
          metrics: [],
          risks: [],
          notes: "OpenAI integration has been disabled"
        },
        'social-sentiment': {
          metrics: [],
          mentions: [],
          notes: "OpenAI integration has been disabled"
        },
        'partnerships': {
          metrics: [],
          opportunities: [],
          notes: "OpenAI integration has been disabled"
        },
        'roadmap': {
          metrics: [],
          milestones: [],
          notes: "OpenAI integration has been disabled"
        },
        'resource-estimator': {
          metrics: [],
          notes: "OpenAI integration has been disabled"
        },
        'funding-pathways': {
          metrics: [],
          pathways: [],
          notes: "OpenAI integration has been disabled"
        },
        'success-stories': {
          companies: [],
          notes: "OpenAI integration has been disabled"
        },
        'simulations': {
          scenarios: [],
          notes: "OpenAI integration has been disabled"
        },
        'quick-poll': {
          questions: [],
          notes: "OpenAI integration has been disabled"
        }
      },
      searchQueries: [],
      totalSearches: 0,
      costEstimate: "$0.00",
      warnings: ["OpenAI integration has been disabled for this dashboard"],
      fromCache: false,
      cacheHit: false
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in web search optimized:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Service error',
        message: error instanceof Error ? error.message : 'Unable to process request'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
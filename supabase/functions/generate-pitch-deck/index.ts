import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea_id, user_id } = await req.json();

    if (!idea_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[generate-pitch-deck] Generating deck for idea:', idea_id);

    // Fetch idea data
    const { data: ideaData } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', idea_id)
      .single();

    // Fetch PMF score
    const { data: scoreData } = await supabase
      .from('idea_scores')
      .select('*')
      .eq('idea_id', idea_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch market analysis
    const { data: analysisData } = await supabase
      .from('idea_analyses')
      .select('*')
      .eq('idea_text', ideaData.original_idea)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Generate pitch deck structure
    const pitchDeck = {
      title: `${ideaData.original_idea}`,
      slides: [
        {
          type: 'cover',
          title: 'Problem & Solution',
          content: ideaData.original_idea,
        },
        {
          type: 'market',
          title: 'Market Opportunity',
          content: analysisData?.market_size || { tam: 'TBD', sam: 'TBD', som: 'TBD' },
        },
        {
          type: 'product',
          title: 'Product Overview',
          content: ideaData.refined_idea || ideaData.original_idea,
        },
        {
          type: 'competition',
          title: 'Competitive Landscape',
          content: analysisData?.competitors || [],
        },
        {
          type: 'traction',
          title: 'PMF Score & Validation',
          content: {
            pmf_score: scoreData?.pmf_score || 0,
            breakdown: scoreData?.score_breakdown || {},
          },
        },
        {
          type: 'gtm',
          title: 'Go-to-Market Strategy',
          content: analysisData?.gtm_strategy || {},
        },
        {
          type: 'financial',
          title: 'Financial Projections',
          content: {
            profit_potential: analysisData?.profit_potential || 0,
          },
        },
        {
          type: 'team',
          title: 'Team & Ask',
          content: 'Your team description here',
        },
      ],
      metadata: {
        generated_at: new Date().toISOString(),
        pmf_score: scoreData?.pmf_score || 0,
      },
    };

    console.log('[generate-pitch-deck] Generated deck with', pitchDeck.slides.length, 'slides');

    return new Response(
      JSON.stringify({ success: true, pitch_deck: pitchDeck }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[generate-pitch-deck] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, tileTypes, userId, sessionId, filters } = await req.json();
    
    if (!idea || !tileTypes || !Array.isArray(tileTypes)) {
      throw new Error('Missing required parameters: idea and tileTypes array');
    }

    console.log(`Batch fetching ${tileTypes.length} tiles for idea: ${idea.substring(0, 50)}...`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare all fetch promises
    const fetchPromises = tileTypes.map(async (tileType: string) => {
      try {
        // Check if data exists in database cache first
        if (userId) {
          const { data: cachedData } = await supabase
            .from('dashboard_data')
            .select('data')
            .eq('user_id', userId)
            .eq('idea_text', idea)
            .eq('tile_type', tileType)
            .gte('expires_at', new Date().toISOString())
            .maybeSingle();

          if (cachedData?.data) {
            console.log(`Using cached data for ${tileType}`);
            return { tileType, data: cachedData.data, fromCache: true };
          }
        }

        // Determine which edge function to call based on tile type
        let functionName = '';
        let payload: any = { idea };

        switch (tileType) {
          case 'quick_stats_pmf_score':
            functionName = 'smoothbrains-score';
            break;
          case 'quick_stats_market_size':
            functionName = 'market-size';
            break;
          case 'quick_stats_competition':
            functionName = 'competition';
            break;
          case 'quick_stats_sentiment':
            functionName = 'sentiment';
            break;
          case 'market_trends':
            functionName = 'market-trends';
            payload = { ...payload, filters };
            break;
          case 'google_trends':
            functionName = 'google-trends';
            payload = { query: idea.split(' ').slice(0, 3).join(' ') };
            break;
          case 'web_search':
            functionName = 'web-search-optimized';
            payload = { query: idea, category: 'news' };
            break;
          case 'reddit_sentiment':
            functionName = 'reddit-sentiment';
            payload = { query: idea };
            break;
          case 'competitor_analysis':
            functionName = 'competitor-analysis';
            break;
          case 'target_audience':
            functionName = 'market-insights';
            payload = { ...payload, insightType: 'audience' };
            break;
          case 'pricing_strategy':
            functionName = 'market-insights';
            payload = { ...payload, insightType: 'pricing' };
            break;
          case 'market_size':
            functionName = 'market-size';
            break;
          case 'growth_projections':
            functionName = 'growth-projections';
            break;
          case 'user_engagement':
            functionName = 'user-engagement';
            break;
          case 'launch_timeline':
            functionName = 'launch-timeline';
            break;
          default:
            console.warn(`Unknown tile type: ${tileType}`);
            return { tileType, data: null, error: 'Unknown tile type' };
        }

        // Fetch data from the appropriate edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${tileType}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache the data if userId is provided
        if (userId && data) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 12); // 12 hour cache

          await supabase
            .from('dashboard_data')
            .upsert({
              user_id: userId,
              session_id: sessionId,
              idea_text: idea,
              tile_type: tileType,
              data: data,
              created_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
            }, {
              onConflict: 'user_id,idea_text,tile_type'
            });
        }

        return { tileType, data, fromCache: false };
      } catch (error) {
        console.error(`Error fetching ${tileType}:`, error);
        return { tileType, data: null, error: error.message };
      }
    });

    // Execute all fetches in parallel
    const results = await Promise.all(fetchPromises);

    // Convert results array to object keyed by tileType
    const batchedData = results.reduce((acc, result) => {
      acc[result.tileType] = {
        data: result.data,
        fromCache: result.fromCache || false,
        error: result.error
      };
      return acc;
    }, {} as any);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: batchedData,
        fetchedCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Batch fetch error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
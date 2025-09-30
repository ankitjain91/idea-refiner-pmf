import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for preventing duplicate API calls (edge function level)
const apiCallCache = new Map<string, { data: any; timestamp: number }>();
const EDGE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Track ongoing requests to prevent duplicate simultaneous calls
const ongoingRequests = new Map<string, Promise<any>>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, tileTypes, userId, sessionId, filters } = await req.json();
    
    if (!idea || !tileTypes || !Array.isArray(tileTypes)) {
      throw new Error('Missing required parameters: idea and tileTypes array');
    }

    console.log(`📋 Batch request for ${tileTypes.length} tiles - User: ${userId?.substring(0, 8) || 'anonymous'}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Deduplicate tile types (in case of duplicate requests)
    const uniqueTileTypes = [...new Set(tileTypes)];
    
    // Separate Groq-based analyses from other API calls
    const groqAnalyses = [];
    const otherAPICalls = [];
    
    for (const tileType of uniqueTileTypes) {
      // Identify which tiles use Groq API
      if (['quick_stats_pmf_score', 'quick_stats_competition', 'quick_stats_sentiment',
          'competitor_analysis', 'target_audience', 'pricing_strategy', 
          'growth_projections'].includes(tileType)) {
        groqAnalyses.push(tileType);
      } else {
        otherAPICalls.push(tileType);
      }
    }
    
    // If we have Groq analyses, batch them into a single call
    let groqResults = {};
    if (groqAnalyses.length > 0) {
      try {
        console.log(`🤖 Batching ${groqAnalyses.length} Groq analyses into single call`);
        
        const groqResponse = await fetch(`${supabaseUrl}/functions/v1/groq-batch-analysis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idea,
            analysisTypes: groqAnalyses
          }),
        });
        
        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          if (groqData.success && groqData.results) {
            groqResults = groqData.results;
            console.log(`✅ Groq batch returned ${Object.keys(groqResults).length} results`);
          }
        }
      } catch (error) {
        console.error('Groq batch analysis failed:', error);
        // Fall back to individual calls if batch fails
      }
    }
    
    // Prepare all fetch promises for remaining API calls
    const fetchPromises = uniqueTileTypes.map(async (tileType: string) => {
      try {
        // Check if we already have the result from Groq batch
        if (groqResults[tileType]) {
          console.log(`✅ Using batched Groq result for ${tileType}`);
          const data = groqResults[tileType];
          
          // Cache the batched result
          const cacheKey = `${tileType}_${idea.substring(0, 50)}_${JSON.stringify(filters || {})}`;
          apiCallCache.set(cacheKey, { data, timestamp: Date.now() });
          
          // Also cache in database if userId is provided
          if (userId && data) {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 12);
            
            try {
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
            } catch (dbError) {
              console.error(`Failed to cache ${tileType} in DB:`, dbError);
            }
          }
          
          return { tileType, data, fromCache: false, cacheLevel: 'batch' };
        }
        
        // Create cache key for this specific request
        const cacheKey = `${tileType}_${idea.substring(0, 50)}_${JSON.stringify(filters || {})}`;
        
        // Check in-memory edge cache first (fastest)
        const cachedResponse = apiCallCache.get(cacheKey);
        if (cachedResponse && Date.now() - cachedResponse.timestamp < EDGE_CACHE_DURATION) {
          console.log(`✅ Edge cache hit for ${tileType}`);
          return { tileType, data: cachedResponse.data, fromCache: true, cacheLevel: 'edge' };
        }
        
        // Check if data exists in database cache
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
            console.log(`✅ DB cache hit for ${tileType}`);
            // Also store in edge cache for faster subsequent access
            apiCallCache.set(cacheKey, { data: cachedData.data, timestamp: Date.now() });
            return { tileType, data: cachedData.data, fromCache: true, cacheLevel: 'database' };
          }
        }

        // Check if there's already an ongoing request for this exact data
        const requestKey = `${cacheKey}_request`;
        if (ongoingRequests.has(requestKey)) {
          console.log(`⏳ Waiting for existing request for ${tileType}`);
          const existingRequest = await ongoingRequests.get(requestKey);
          return { tileType, data: existingRequest, fromCache: false, cacheLevel: 'deduplicated' };
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

        // Create the request promise
        const requestPromise = (async () => {
          console.log(`🔄 Fetching fresh data for ${tileType}`);
          
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
          
          // Store in edge cache
          apiCallCache.set(cacheKey, { data, timestamp: Date.now() });
          
          // Clean up ongoing request tracking
          ongoingRequests.delete(requestKey);
          
          return data;
        })();

        // Track this ongoing request to prevent duplicates
        ongoingRequests.set(requestKey, requestPromise);

        const data = await requestPromise;

        // Cache the data in database if userId is provided
        if (userId && data) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 12); // 12 hour cache

          // Use upsert with a try-catch to handle potential conflicts
          try {
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
          } catch (dbError) {
            console.error(`Failed to cache ${tileType} in DB:`, dbError);
            // Continue even if caching fails
          }
        }

        return { tileType, data, fromCache: false, cacheLevel: 'fresh' };
      } catch (error) {
        console.error(`❌ Error fetching ${tileType}:`, error);
        // Clean up on error
        const requestKey = `${tileType}_${idea.substring(0, 50)}_${JSON.stringify(filters || {})}_request`;
        ongoingRequests.delete(requestKey);
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
        cacheLevel: result.cacheLevel || 'unknown',
        error: result.error
      };
      return acc;
    }, {} as any);

    // Clean up old cache entries if cache is getting too large
    if (apiCallCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of apiCallCache.entries()) {
        if (now - value.timestamp > EDGE_CACHE_DURATION) {
          apiCallCache.delete(key);
        }
      }
    }

    const summary = {
      total: results.length,
      cached: results.filter(r => r.fromCache).length,
      fresh: results.filter(r => !r.fromCache && !r.error).length,
      errors: results.filter(r => r.error).length,
      cacheBreakdown: {
        edge: results.filter(r => r.cacheLevel === 'edge').length,
        database: results.filter(r => r.cacheLevel === 'database').length,
        deduplicated: results.filter(r => r.cacheLevel === 'deduplicated').length,
        batch: results.filter(r => r.cacheLevel === 'batch').length,
        fresh: results.filter(r => r.cacheLevel === 'fresh').length,
      }
    };
    
    console.log(`✅ Batch complete: ${summary.cached} cached, ${summary.fresh} fresh, ${summary.errors} errors`);
    console.log(`   Cache breakdown: Edge=${summary.cacheBreakdown.edge}, DB=${summary.cacheBreakdown.database}, Dedup=${summary.cacheBreakdown.deduplicated}, Fresh=${summary.cacheBreakdown.fresh}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: batchedData,
        fetchedCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length,
        summary
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
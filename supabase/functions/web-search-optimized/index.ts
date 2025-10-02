import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { summarizeQuery } from '../_shared/query-summarizer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filters, requestType = 'dashboard', tileType } = await req.json();
    
    console.log('Web search optimized request:', { filters, requestType, tileType });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Extract search parameters
    const idea = filters?.idea_keywords?.join(' ') || '';
    const industry = filters?.industry || '';
    const geo = filters?.geography || 'us';
    const timeWindow = filters?.time_window || '12 months';
    
    // Check cache first (using idea + filters as key)
    const cacheKey = `${idea}_${industry}_${geo}_${timeWindow}`;
    const cacheExpiry = requestType === 'tile-details' ? 15 : 60; // minutes
    
    // Try to get from cache
    const { data: cachedData } = await supabase
      .from('web_search_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (cachedData) {
      console.log('Returning cached data');
      return new Response(
        JSON.stringify({
          ...cachedData.data,
          cacheHit: true,
          updatedAt: cachedData.created_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build grouped search queries
    let searchQueries = [];
    let totalCost = 0;
    
    if (requestType === 'dashboard') {
      // Group A: Market and competitor insights - summarized to 5-7 words
      const fullQueryA = `${idea} market size competitors funding comparable startups demographics ${timeWindow} ${geo}`;
      const queryA = summarizeQuery(fullQueryA);
      
      // Group B: Operational insights - summarized to 5-7 words
      const fullQueryB = `${industry} CAC LTV benchmarks risks regulations ${geo} partnerships investor interest forum sentiment 30 60 90 MVP plan`;
      const queryB = summarizeQuery(fullQueryB);
      
      console.log(`[web-search-optimized] Summarized queries - A: "${queryA}", B: "${queryB}"`);
      searchQueries = [queryA, queryB];
      
      // Execute searches in parallel (try Brave first, then Serper, fallback to Tavily)
      const searchPromises = searchQueries.map(async (query) => {
        // Try Brave Search first
        try {
          const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
          if (BRAVE_API_KEY) {
            const braveUrl = new URL('https://api.search.brave.com/res/v1/web/search');
            braveUrl.searchParams.append('q', query);
            braveUrl.searchParams.append('count', '10');
            braveUrl.searchParams.append('country', geo);
            
            const braveResponse = await fetch(braveUrl.toString(), {
              method: 'GET',
              headers: {
                'X-Subscription-Token': BRAVE_API_KEY,
                'Accept': 'application/json'
              }
            });
            
            if (braveResponse.ok) {
              const braveData = await braveResponse.json();
              // Transform Brave data to match expected format
              const transformedData = {
                organic: braveData.web?.results?.map((item: any) => ({
                  title: item.title,
                  link: item.url,
                  snippet: item.description,
                  position: item.position
                })) || []
              };
              totalCost += 0.0001; // Brave Search cost estimate
              console.log('Using Brave Search for query');
              return transformedData;
            }
          }
        } catch (err) {
          console.error('Brave search failed:', err);
        }
        
        // Fallback to Serper
        try {
          const serperResponse = await fetch(`${SUPABASE_URL}/functions/v1/serper-batch-search`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idea: query, searchTypes: ['general'] })
          });
          
          if (serperResponse.ok) {
            const data = await serperResponse.json();
            totalCost += 0.0003; // $0.30 per 1000 queries
            return data.results?.general || data;
          }
        } catch (err) {
          console.error('Serper search failed:', err);
        }
        
        // Fallback to Tavily
        try {
          const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');
          if (TAVILY_API_KEY) {
            const tavilyResponse = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                api_key: TAVILY_API_KEY,
                query, 
                max_results: 10 
              })
            });
            
            if (tavilyResponse.ok) {
              const tavilyData = await tavilyResponse.json();
              // Transform Tavily data to match expected format
              const transformedData = {
                organic: tavilyData.results?.map((item: any) => ({
                  title: item.title,
                  link: item.url,
                  snippet: item.content,
                  position: item.position
                })) || []
              };
              totalCost += 0.008; // $0.008 per credit
              return transformedData;
            }
          }
        } catch (err) {
          console.error('Tavily search failed:', err);
        }
        
        return null;
      });
      
      const searchResults = await Promise.all(searchPromises);
      
      // Extract top URLs from search results
      const allUrls = new Set<string>();
      searchResults.forEach(result => {
        if (result?.organic) {
          result.organic.slice(0, 5).forEach((item: any) => {
            if (item.link || item.url) {
              allUrls.add(item.link || item.url);
            }
          });
        }
      });
      
      // Fetch content from top 3-5 URLs using Firecrawl
      const urlsToFetch = Array.from(allUrls).slice(0, 5);
      let pageContent = [];
      
      if (urlsToFetch.length > 0) {
        try {
          const firecrawlResponse = await fetch(`${SUPABASE_URL}/functions/v1/firecrawl-fetch`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ urls: urlsToFetch, maxChars: 800 })
          });
          
          if (firecrawlResponse.ok) {
            const data = await firecrawlResponse.json();
            pageContent = data.data || [];
            totalCost += data.credits * 0.001; // Estimate $0.001 per credit
          }
        } catch (err) {
          console.error('Firecrawl fetch failed:', err);
        }
      }
      
      // Get GDELT news/sentiment data
      let newsData = null;
      try {
        const gdeltResponse = await fetch(`${SUPABASE_URL}/functions/v1/gdelt-news`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: idea, maxRecords: 50 })
        });
        
        if (gdeltResponse.ok) {
          newsData = await gdeltResponse.json();
          // GDELT is free
        }
      } catch (err) {
        console.error('GDELT fetch failed:', err);
      }
      
      // Synthesize all data using Groq
      const tiles: Record<string, any> = {};
      const tileTypes = [
        'search-trends', 'competitor-landscape', 'target-audience', 
        'pm-fit-score', 'market-potential', 'unit-economics'
      ];
      
      // Process each tile type
      for (const type of tileTypes) {
        try {
          const groqResponse = await fetch(`${SUPABASE_URL}/functions/v1/groq-synthesis`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              searchResults,
              pageContent,
              newsData,
              tileType: type,
              filters
            })
          });
          
          if (groqResponse.ok) {
            const synthesis = await groqResponse.json();
            tiles[type] = synthesis.data;
            totalCost += parseFloat(synthesis.usage?.costEstimate?.replace('$', '') || '0');
          }
        } catch (err) {
          console.error(`Groq synthesis failed for ${type}:`, err);
          // Provide fallback data
          tiles[type] = {
            metrics: [],
            items: [],
            insights: [`Unable to synthesize ${type} data`],
            citations: []
          };
        }
      }
      
      const responseData = {
        tiles,
        searchQueries,
        totalSearches: searchQueries.length,
        costEstimate: `$${totalCost.toFixed(4)}`,
        cacheHit: false,
        updatedAt: new Date().toISOString()
      };
      
      // Cache the results (create table if needed)
      try {
        await supabase
          .from('web_search_cache')
          .upsert({
            cache_key: cacheKey,
            data: responseData,
            expires_at: new Date(Date.now() + cacheExpiry * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          });
      } catch (cacheErr) {
        console.warn('Failed to cache results:', cacheErr);
      }
      
      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } else if (requestType === 'tile-details' && tileType) {
      // On-click deepening - single targeted search
      const detailQuery = `${idea} ${tileType.replace('-', ' ')} detailed analysis ${geo}`;
      
      // Execute targeted search (try Brave first, then Serper)
      let searchResult = null;
      
      // Try Brave Search first
      try {
        const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
        if (BRAVE_API_KEY) {
          const braveUrl = new URL('https://api.search.brave.com/res/v1/web/search');
          braveUrl.searchParams.append('q', detailQuery);
          braveUrl.searchParams.append('count', '5');
          braveUrl.searchParams.append('country', geo);
          
          const braveResponse = await fetch(braveUrl.toString(), {
            method: 'GET',
            headers: {
              'X-Subscription-Token': BRAVE_API_KEY,
              'Accept': 'application/json'
            }
          });
          
          if (braveResponse.ok) {
            const braveData = await braveResponse.json();
            searchResult = {
              organic: braveData.web?.results?.map((item: any) => ({
                title: item.title,
                link: item.url,
                snippet: item.description,
                position: item.position
              })) || []
            };
            totalCost += 0.0001;
            console.log('Using Brave Search for detail query');
          }
        }
      } catch (err) {
        console.error('Brave detail search failed:', err);
      }
      
      // Fallback to Serper if Brave failed
      if (!searchResult) {
        try {
          const serperResponse = await fetch(`${SUPABASE_URL}/functions/v1/serper-batch-search`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idea: detailQuery, searchTypes: ['general'] })
          });
          
          if (serperResponse.ok) {
            const data = await serperResponse.json();
            searchResult = data.results?.general || data;
            totalCost += 0.0003;
          }
        } catch (err) {
          console.error('Serper detail search failed:', err);
        }
      }
      
      // Fetch one key URL
      let detailContent = null;
      if (searchResult?.organic?.[0]?.link) {
        try {
          const firecrawlResponse = await fetch(`${SUPABASE_URL}/functions/v1/firecrawl-fetch`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ urls: [searchResult.organic[0].link], maxChars: 1200 })
          });
          
          if (firecrawlResponse.ok) {
            const data = await firecrawlResponse.json();
            detailContent = data.data?.[0];
            totalCost += 0.001;
          }
        } catch (err) {
          console.error('Detail fetch failed:', err);
        }
      }
      
      // Quick Groq synthesis
      let detailSynthesis = null;
      try {
        const groqResponse = await fetch(`${SUPABASE_URL}/functions/v1/groq-synthesis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            searchResults: [searchResult],
            pageContent: detailContent ? [detailContent] : [],
            tileType,
            filters
          })
        });
        
        if (groqResponse.ok) {
          const synthesis = await groqResponse.json();
          detailSynthesis = synthesis.data;
          totalCost += parseFloat(synthesis.usage?.costEstimate?.replace('$', '') || '0');
        }
      } catch (err) {
        console.error('Detail synthesis failed:', err);
      }
      
      return new Response(
        JSON.stringify({
          tileType,
          details: detailSynthesis,
          costEstimate: `$${totalCost.toFixed(4)}`,
          updatedAt: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Default response
    return new Response(
      JSON.stringify({
        error: 'Invalid request type',
        requestType
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error in web-search-optimized:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        tiles: {},
        searchQueries: [],
        totalSearches: 0,
        costEstimate: '$0',
        cacheHit: false,
        updatedAt: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
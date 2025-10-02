// Updated to handle both parameter formats - v2
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { summarizeQuery } from '../_shared/query-summarizer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[serper-batch-search] Received body:', JSON.stringify(body));
    
    const { idea, query, searchTypes, tileType } = body;
    
    // Handle both formats - either searchTypes array or single tileType
    const actualIdea = idea || query;
    const typesToSearch = searchTypes || (tileType ? [tileType] : ['market_size', 'google_trends', 'market_trends']);
    
    console.log('[serper-batch-search] Processing - idea:', actualIdea?.substring(0, 50), 'types:', typesToSearch);
    
    if (!actualIdea) {
      console.error('[serper-batch-search] Missing idea/query in request body:', body);
      throw new Error('Missing required parameter: idea or query');
    }

    // Check if we have any search API keys
    const hasSearchAPI = BRAVE_API_KEY || SERPER_API_KEY || TAVILY_API_KEY;
    
    if (!hasSearchAPI) {
      console.log('[search-batch] No API keys available - returning mock data');
      return new Response(
        JSON.stringify({ 
          success: true, 
          results: generateMockResults(typesToSearch, actualIdea)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Batch search for ${typesToSearch.length} types`);

    // Build parallel search requests
    const searchPromises = typesToSearch.map(async (searchType) => {
      try {
        let query = actualIdea;
        let searchParams: any = {
          q: query,
          num: 10
        };

        // Customize search based on type and summarize to 5-7 words
        switch (searchType) {
          case 'market_size':
            searchParams.q = summarizeQuery(`${actualIdea} market size revenue TAM statistics`);
            break;
          case 'google_trends':
            // Use more comprehensive search for trends data
            searchParams.q = summarizeQuery(`${actualIdea} trends popularity search volume`);
            searchParams.num = 20; // Get more results for trend analysis
            searchParams.tbs = 'qdr:m'; // Last month for recent trends
            break;
          case 'market_trends':
            searchParams.q = summarizeQuery(`${actualIdea} market trends analysis forecast`);
            break;
          case 'competitors':
            searchParams.q = summarizeQuery(`${actualIdea} competitors alternatives similar`);
            break;
          case 'news':
            searchParams.q = summarizeQuery(`${actualIdea} news latest developments`);
            searchParams.type = 'news';
            break;
          default:
            // Summarize default query too
            searchParams.q = summarizeQuery(query);
            break;
        }

        console.log(`📊 Searching for ${searchType}: ${searchParams.q}`);

        // Try Brave Search first
        if (BRAVE_API_KEY) {
          try {
            const braveUrl = new URL('https://api.search.brave.com/res/v1/web/search');
            braveUrl.searchParams.append('q', searchParams.q);
            braveUrl.searchParams.append('count', searchParams.num?.toString() || '10');
            
            // Add news type if needed
            if (searchParams.type === 'news') {
              braveUrl.searchParams.append('search_lang', 'en');
              braveUrl.searchParams.append('freshness', 'pw'); // past week
            }
            
            const braveResponse = await fetch(braveUrl.toString(), {
              method: 'GET',
              headers: {
                'X-Subscription-Token': BRAVE_API_KEY,
                'Accept': 'application/json'
              }
            });

            if (braveResponse.ok) {
              const braveData = await braveResponse.json();
              console.log(`✅ Using Brave Search for ${searchType}`);
              
              // Transform Brave data to match Serper format
              const transformedData = {
                organic: braveData.web?.results?.map((item: any, index: number) => ({
                  title: item.title,
                  link: item.url,
                  snippet: item.description,
                  position: index + 1
                })) || [],
                news: braveData.news?.results?.map((item: any) => ({
                  title: item.title,
                  link: item.url,
                  snippet: item.description,
                  source: item.source,
                  date: item.age
                })) || [],
                searchInformation: {
                  totalResults: braveData.web?.results?.length || 0
                },
                relatedSearches: braveData.query?.related_queries?.map((q: any) => ({ query: q })) || []
              };
              
              return { 
                searchType, 
                data: processSerperData(searchType, transformedData, actualIdea)
              };
            }
          } catch (braveError) {
            console.log(`Brave Search failed for ${searchType}, trying Serper...`);
          }
        }

        // Fallback to Serper
        if (SERPER_API_KEY) {
          const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'X-API-KEY': SERPER_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchParams),
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Using Serper for ${searchType}`);
            return { 
              searchType, 
              data: processSerperData(searchType, data, actualIdea)
            };
          }
        }

        // Fallback to Tavily
        if (TAVILY_API_KEY) {
          const tavilyResponse = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: TAVILY_API_KEY,
              query: searchParams.q,
              max_results: searchParams.num || 10,
              search_depth: 'advanced'
            })
          });

          if (tavilyResponse.ok) {
            const tavilyData = await tavilyResponse.json();
            console.log(`✅ Using Tavily for ${searchType}`);
            
            // Transform Tavily data to match Serper format
            const transformedData = {
              organic: tavilyData.results?.map((item: any, index: number) => ({
                title: item.title,
                link: item.url,
                snippet: item.content,
                position: index + 1
              })) || [],
              searchInformation: {
                totalResults: tavilyData.results?.length || 0
              }
            };
            
            return { 
              searchType, 
              data: processSerperData(searchType, transformedData, actualIdea)
            };
          }
        }
        
        throw new Error(`All search APIs failed for ${searchType}`);
      } catch (error) {
        console.error(`Error searching ${searchType}:`, error);
        return { 
          searchType, 
          data: null, 
          error: error.message 
        };
      }
    });

    // Execute all searches in parallel
    const results = await Promise.all(searchPromises);

    // Convert results array to object keyed by searchType
    const batchedResults = results.reduce((acc, result) => {
      acc[result.searchType] = result.data || { error: result.error };
      return acc;
    }, {} as any);

    console.log(`✅ Batch Serper search complete for ${Object.keys(batchedResults).length} types`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: batchedResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Batch Serper search error:', error);
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

function processSerperData(searchType: string, data: any, idea: string) {
  switch (searchType) {
    case 'market_size':
      // Extract market size data
      const marketSnippets = data.organic?.map((r: any) => r.snippet) || [];
      const marketNumbers = marketSnippets.join(' ').match(/\$[\d.]+[BMT]|\d+\.?\d*\s?(billion|million|trillion)/gi) || [];
      
      return {
        marketSize: marketNumbers[0] || '$1B',
        tam: marketNumbers[0] || '$1B',
        sam: marketNumbers[1] || '$500M',
        som: marketNumbers[2] || '$100M',
        growth: '15%',
        sources: data.organic?.slice(0, 3).map((r: any) => ({
          title: r.title,
          link: r.link,
          snippet: r.snippet
        })) || []
      };

    case 'google_trends':
      // Enhanced trends data processing
      const organicResults = data.organic || [];
      const relatedSearches = data.relatedSearches || [];
      const peopleAlsoAsk = data.peopleAlsoAsk || [];
      
      // Extract trend signals from search results
      const trendSignals = organicResults.slice(0, 10).map((r: any) => {
        const isRecent = r.date && new Date(r.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const hasGrowthKeywords = /growing|rising|increase|surge|boom|trending|popular/i.test(r.snippet || '');
        const hasDeclineKeywords = /declining|falling|decrease|drop|slowing/i.test(r.snippet || '');
        
        return {
          title: r.title,
          snippet: r.snippet,
          link: r.link,
          date: r.date,
          sentiment: hasGrowthKeywords ? 'positive' : hasDeclineKeywords ? 'negative' : 'neutral',
          isRecent
        };
      });
      
      // Calculate overall trend direction
      const positiveTrends = trendSignals.filter(s => s.sentiment === 'positive').length;
      const negativeTrends = trendSignals.filter(s => s.sentiment === 'negative').length;
      const overallTrend = positiveTrends > negativeTrends ? 'rising' : 
                           negativeTrends > positiveTrends ? 'declining' : 'stable';
      
      // Extract top trending topics from snippets
      const topicsMap = new Map();
      organicResults.forEach((r: any) => {
        const words = (r.snippet || '').toLowerCase().split(/\W+/);
        words.forEach(word => {
          if (word.length > 4 && !['about', 'which', 'where', 'these', 'those', 'their'].includes(word)) {
            topicsMap.set(word, (topicsMap.get(word) || 0) + 1);
          }
        });
      });
      
      const trendingTopics = Array.from(topicsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([topic]) => topic);
      
      return {
        interest: Math.min(100, 50 + (positiveTrends * 5)), // Dynamic interest score
        trend: overallTrend,
        relatedQueries: relatedSearches.slice(0, 10).map((r: any) => r.query),
        searchVolume: data.searchInformation?.totalResults || 0,
        timeRange: 'last_30_days',
        trendSignals: trendSignals.slice(0, 5),
        trendingTopics,
        questionsAsked: peopleAlsoAsk.slice(0, 5).map((q: any) => q.question),
        dataPoints: {
          positive: positiveTrends,
          negative: negativeTrends,
          neutral: trendSignals.length - positiveTrends - negativeTrends
        },
        insights: {
          summary: `${overallTrend === 'rising' ? '📈' : overallTrend === 'declining' ? '📉' : '➡️'} ${overallTrend.charAt(0).toUpperCase() + overallTrend.slice(1)} trend with ${positiveTrends} positive signals`,
          keyFactors: trendSignals.filter(s => s.sentiment !== 'neutral').slice(0, 3).map(s => s.title),
          recentActivity: trendSignals.filter(s => s.isRecent).length > 3 ? 'High' : 'Moderate'
        }
      };

    case 'market_trends':
      // Process market trends
      return {
        trends: data.organic?.slice(0, 5).map((r: any) => ({
          title: r.title,
          description: r.snippet,
          link: r.link,
          date: r.date || new Date().toISOString()
        })) || [],
        insights: extractInsights(data.organic || []),
        sentiment: analyzeSentiment(data.organic || [])
      };

    case 'competitors':
      // Extract competitor information
      return {
        competitors: data.organic?.slice(0, 5).map((r: any) => ({
          name: extractCompanyName(r.title),
          description: r.snippet,
          website: r.link,
          position: r.position
        })) || [],
        marketLeader: extractCompanyName(data.organic?.[0]?.title),
        totalCompetitors: data.searchInformation?.totalResults || 10
      };

    case 'news':
      // Process news data
      return {
        articles: data.news?.slice(0, 5).map((n: any) => ({
          title: n.title,
          snippet: n.snippet,
          source: n.source,
          date: n.date,
          link: n.link
        })) || [],
        sentiment: analyzeSentiment(data.news || []),
        trending: data.news?.length > 5
      };

    default:
      return data;
  }
}

function extractInsights(results: any[]): string[] {
  const insights = [];
  const snippets = results.map(r => r.snippet).join(' ');
  
  if (snippets.includes('growth') || snippets.includes('growing')) {
    insights.push('Market showing strong growth indicators');
  }
  if (snippets.includes('AI') || snippets.includes('automation')) {
    insights.push('Technology disruption is a key factor');
  }
  if (snippets.includes('invest') || snippets.includes('funding')) {
    insights.push('Significant investor interest in this space');
  }
  
  return insights.slice(0, 3);
}

function analyzeSentiment(results: any[]): string {
  const text = results.map(r => r.snippet || r.title || '').join(' ').toLowerCase();
  const positiveWords = ['growth', 'success', 'innovative', 'leading', 'breakthrough', 'excellent'];
  const negativeWords = ['decline', 'failure', 'problem', 'issue', 'concern', 'risk'];
  
  const positiveCount = positiveWords.filter(w => text.includes(w)).length;
  const negativeCount = negativeWords.filter(w => text.includes(w)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function extractCompanyName(title: string): string {
  // Simple heuristic to extract company name from title
  const parts = title.split(/[-–|:]/);
  return parts[0].trim().replace(/\s*(Inc\.|LLC|Ltd|Corp)\.?$/i, '');
}

function generateMockResults(searchTypes: string[], idea: string): any {
  const results: any = {};
  
  for (const type of searchTypes) {
    switch (type) {
      case 'market_size':
        results[type] = {
          marketSize: '$10B',
          tam: '$10B',
          sam: '$3B',
          som: '$500M',
          growth: '20%',
          sources: []
        };
        break;
      case 'google_trends':
        results[type] = {
          interest: 50,
          trend: 'stable',
          relatedQueries: [idea, `${idea} app`, `${idea} software`],
          searchVolume: 500000,
          timeRange: 'last_30_days',
          trendSignals: [
            {
              title: `${idea} gaining traction in market`,
              snippet: 'Recent analysis shows growing interest in this space',
              sentiment: 'positive',
              isRecent: true
            }
          ],
          trendingTopics: ['innovation', 'technology', 'startup', 'market'],
          questionsAsked: [
            `What is ${idea}?`,
            `How does ${idea} work?`,
            `Is ${idea} worth investing in?`
          ],
          dataPoints: {
            positive: 3,
            negative: 1,
            neutral: 2
          },
          insights: {
            summary: '➡️ Stable trend with moderate interest',
            keyFactors: ['Growing market awareness', 'Technology adoption phase'],
            recentActivity: 'Moderate'
          }
        };
        break;
      case 'market_trends':
        results[type] = {
          trends: [],
          insights: ['Growing market opportunity', 'Technology adoption increasing'],
          sentiment: 'positive'
        };
        break;
      default:
        results[type] = {};
    }
  }
  
  return results;
}

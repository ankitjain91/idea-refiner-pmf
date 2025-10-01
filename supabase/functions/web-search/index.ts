import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea_keywords, industry, geography, time_window } = await req.json();
    
    if (!idea_keywords) {
      throw new Error('idea_keywords is required');
    }

    console.log('[web-search] Processing query:', idea_keywords);

    // Get API keys
    const scraperApiKey = Deno.env.get('SCRAPERAPI_API_KEY');
    const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
    const serperApiKey = Deno.env.get('SERPER_API_KEY');
    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    // Primary: ScraperAPI for Google search results
    let searchResults: any = null;
    let searchError: string | null = null;

    if (scraperApiKey) {
      try {
        console.log('[web-search] Using ScraperAPI for primary search');
        
        // Use ScraperAPI to scrape Google search results
        const googleSearchUrl = `https://www.google.com/search?` + new URLSearchParams({
          q: idea_keywords,
          num: '20',
          hl: 'en',
          gl: geography?.toLowerCase()?.substring(0, 2) || 'us'
        });

        const scraperResponse = await fetch(
          `https://api.scraperapi.com?` + new URLSearchParams({
            api_key: scraperApiKey,
            url: googleSearchUrl,
            render: 'false'
          })
        );

        if (scraperResponse.ok) {
          const htmlContent = await scraperResponse.text();
          // Parse the HTML to extract search results
          searchResults = parseGoogleSearchResults(htmlContent);
          console.log('[web-search] ScraperAPI returned', searchResults.organic_results?.length || 0, 'results');
        } else {
          searchError = `ScraperAPI error: ${scraperResponse.status}`;
        }
      } catch (error: any) {
        console.error('[web-search] ScraperAPI error:', error);
        searchError = error.message || String(error);
      }
    }

    // Fallback to Tavily if SerpApi fails
    if (!searchResults && tavilyApiKey) {
      try {
        console.log('[web-search] Falling back to Tavily');
        const tavilyResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'api-key': tavilyApiKey
          },
          body: JSON.stringify({
            query: idea_keywords,
            search_depth: 'advanced',
            max_results: 20,
            include_domains: [],
            exclude_domains: []
          })
        });

        if (tavilyResponse.ok) {
          const tavilyData = await tavilyResponse.json();
          searchResults = {
            organic_results: tavilyData.results?.map((r: any) => ({
              title: r.title,
              link: r.url,
              snippet: r.content,
              position: 0
            }))
          };
        }
      } catch (error) {
        console.error('[web-search] Tavily error:', error);
      }
    }

    // Fallback to Serper if others fail
    if (!searchResults && serperApiKey) {
      try {
        console.log('[web-search] Falling back to Serper');
        const serperResponse = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            q: idea_keywords,
            location: geography || 'United States',
            gl: 'us',
            hl: 'en',
            num: 20
          })
        });

        if (serperResponse.ok) {
          const serperData = await serperResponse.json();
          searchResults = {
            organic_results: serperData.organic || []
          };
        }
      } catch (error) {
        console.error('[web-search] Serper error:', error);
      }
    }

    if (!searchResults) {
      throw new Error(searchError || 'No search API available or all failed');
    }

    // Process search results
    const organicResults = searchResults.organic_results || [];
    const ads = searchResults.ads || [];
    const relatedSearches = searchResults.related_searches || [];
    const peopleAlsoAsk = searchResults.people_also_ask || [];

    // Extract and classify queries
    const queries = new Set<string>();
    
    // Add main keyword
    queries.add(idea_keywords);
    
    // Add related searches
    relatedSearches?.forEach((rs: any) => queries.add(rs.query || rs));
    
    // Add people also ask
    peopleAlsoAsk?.forEach((paa: any) => queries.add(paa.question || paa));
    
    // Extract queries from titles and snippets
    organicResults.forEach((result: any) => {
      // Extract potential search queries from titles
      const title = result.title?.toLowerCase() || '';
      if (title.includes('how to') || title.includes('best') || title.includes('buy')) {
        queries.add(result.title);
      }
    });

    // Classify queries by intent
    const classifiedQueries = Array.from(queries).slice(0, 12).map(query => {
      const q = String(query).toLowerCase();
      let intent = 'informational';
      let commercialScore = 0;

      // Transactional keywords
      const transactionalKeywords = [
        'buy', 'price', 'cost', 'cheap', 'affordable', 'discount',
        'deal', 'offer', 'sale', 'shop', 'store', 'purchase',
        'order', 'pricing', 'payment', 'subscription', 'free trial'
      ];

      // Commercial investigation keywords
      const commercialKeywords = [
        'best', 'top', 'review', 'comparison', 'vs', 'compare',
        'alternative', 'competitor', 'recommendation', 'worth it'
      ];

      // Navigational keywords
      const navigationalKeywords = [
        'login', 'sign in', 'website', 'official', 'homepage',
        '.com', '.org', 'contact', 'support'
      ];

      // Local intent keywords
      const localKeywords = [
        'near me', 'nearby', 'local', 'in my area', 'close by'
      ];

      if (transactionalKeywords.some(kw => q.includes(kw))) {
        intent = 'transactional';
        commercialScore = 3;
      } else if (localKeywords.some(kw => q.includes(kw))) {
        intent = 'transactional-local';
        commercialScore = 3;
      } else if (commercialKeywords.some(kw => q.includes(kw))) {
        intent = 'commercial';
        commercialScore = 2;
      } else if (navigationalKeywords.some(kw => q.includes(kw))) {
        intent = 'navigational';
        commercialScore = 1;
      }

      return {
        query: String(query),
        intent,
        commercialScore
      };
    });

    // Sort by commercial score
    classifiedQueries.sort((a, b) => b.commercialScore - a.commercialScore);

    // Calculate metrics
    const adDensity = ads.length / Math.max(organicResults.length, 1);
    const competitionIntensity = Math.min(100, Math.round((adDensity * 100) + (ads.length * 5)));
    
    const transactionalQueries = classifiedQueries.filter(q => 
      q.intent === 'transactional' || q.intent === 'transactional-local'
    );
    const commercialQueries = classifiedQueries.filter(q => q.intent === 'commercial');
    
    const monetizationPotential = Math.min(100, Math.round(
      (transactionalQueries.length * 15) + 
      (commercialQueries.length * 10) + 
      (adDensity * 50)
    ));

    // Get top competitors (sites that appear most in results)
    const competitorDomains = new Map<string, number>();
    organicResults.forEach((result: any) => {
      try {
        const domain = new URL(result.link).hostname.replace('www.', '');
        competitorDomains.set(domain, (competitorDomains.get(domain) || 0) + 1);
      } catch {}
    });

    const topCompetitors = Array.from(competitorDomains.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, appearances: count }));

    // Firecrawl top URLs for competitor insights
    let competitorInsights: any[] = [];
    if (firecrawlApiKey && organicResults.length > 0) {
      const urlsToScrape = organicResults
        .slice(0, 3)
        .map((r: any) => r.link)
        .filter((url: string) => url && url.startsWith('http'));

      console.log('[web-search] Scraping', urlsToScrape.length, 'URLs with Firecrawl');

      for (const url of urlsToScrape) {
        try {
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url,
              formats: ['markdown'],
              onlyMainContent: true,
              waitFor: 1000
            })
          });

          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            if (scrapeData.success && scrapeData.data) {
              const content = scrapeData.data.markdown || '';
              const snippet = content.substring(0, 500);
              
              // Extract pricing if mentioned
              const priceMatches = content.match(/\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:USD|EUR|GBP)/gi);
              
              competitorInsights.push({
                url,
                domain: new URL(url).hostname.replace('www.', ''),
                snippet,
                hasPricing: !!priceMatches,
                prices: priceMatches?.slice(0, 3)
              });
            }
          }
        } catch (error) {
          console.error('[web-search] Firecrawl error for', url, error);
        }
      }
    }

    // Build response
    const response = {
      updatedAt: new Date().toISOString(),
      filters: {
        idea: idea_keywords,
        industry: industry || 'general',
        geo: geography || 'global',
        time_window: time_window || 'last_90_days'
      },
      metrics: [
        {
          name: 'Competition Intensity',
          value: `${competitionIntensity}%`,
          unit: '',
          confidence: 0.8,
          explanation: `Based on ${ads.length} ads and ${organicResults.length} organic results`,
          assumptions: ['Higher ad density indicates more competition']
        },
        {
          name: 'Monetization Potential',
          value: `${monetizationPotential}%`,
          unit: '',
          confidence: 0.7,
          explanation: `${transactionalQueries.length} transactional and ${commercialQueries.length} commercial queries found`,
          assumptions: ['Transactional queries indicate buying intent']
        }
      ],
      series: [],
      items: classifiedQueries.slice(0, 5).map(q => ({
        title: q.query,
        snippet: `Intent: ${q.intent}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(q.query)}`,
        published: new Date().toISOString(),
        source: 'Search Analysis',
        evidence: topCompetitors.slice(0, 3).map(c => c.domain)
      })),
      top_queries: transactionalQueries.slice(0, 6).map(q => q.query),
      competitors: topCompetitors,
      competitor_insights: competitorInsights,
      citations: [
        ...organicResults.slice(0, 5).map((r: any) => ({
          label: r.title,
          url: r.link,
          published: new Date().toISOString()
        })),
        ...competitorInsights.map(ci => ({
          label: `Scraped: ${ci.domain}`,
          url: ci.url,
          published: new Date().toISOString()
        }))
      ],
      warnings: searchError ? [`Search partially failed: ${searchError}`] : []
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[web-search] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || String(error),
        metrics: [],
        series: [],
        items: [],
        citations: [],
        warnings: ['Failed to fetch search data']
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to parse Google search results from HTML
function parseGoogleSearchResults(html: string): any {
  const results = {
    organic_results: [],
    ads: [],
    related_searches: [],
    people_also_ask: []
  };

  try {
    // Extract organic results - looking for search result patterns
    const organicMatches = html.matchAll(/<a[^>]*href="([^"]*)"[^>]*><h3[^>]*>([^<]*)<\/h3>/gi);
    let position = 1;
    for (const match of organicMatches) {
      const url = match[1];
      const title = match[2];
      
      // Skip Google's own URLs
      if (url && !url.includes('google.com') && title) {
        // Extract snippet - usually in a span after the title
        const snippetMatch = html.match(new RegExp(`${title}[^>]*>([^<]{50,300})`, 'i'));
        
        results.organic_results.push({
          title: title.replace(/&[^;]+;/g, ''), // Remove HTML entities
          link: url.startsWith('/url?q=') ? url.split('/url?q=')[1].split('&')[0] : url,
          snippet: snippetMatch ? snippetMatch[1].replace(/&[^;]+;/g, '') : '',
          position: position++
        });
      }
    }

    // Extract "People also ask" questions
    const paaMatches = html.matchAll(/role="heading"[^>]*>([^<]*\?)/gi);
    for (const match of paaMatches) {
      const question = match[1];
      if (question && !results.people_also_ask.includes(question)) {
        results.people_also_ask.push({ question: question.replace(/&[^;]+;/g, '') });
      }
    }

    // Extract related searches
    const relatedMatches = html.matchAll(/Related searches[^>]*>([^<]*)</gi);
    for (const match of relatedMatches) {
      const query = match[1];
      if (query && query.length > 3) {
        results.related_searches.push({ query: query.replace(/&[^;]+;/g, '') });
      }
    }

    // Count ads (simplified - looking for "Ad" or "Sponsored" markers)
    const adCount = (html.match(/\bAd\b|\bSponsored\b/gi) || []).length;
    for (let i = 0; i < Math.min(adCount, 3); i++) {
      results.ads.push({ position: i + 1 });
    }

  } catch (error) {
    console.error('[web-search] Error parsing HTML:', error);
  }

  return results;
}
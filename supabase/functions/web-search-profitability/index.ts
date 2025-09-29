import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

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
    const { idea, industry, geo, time_window } = await req.json();
    
    if (!idea) {
      throw new Error('Idea parameter is required');
    }

    console.log('[web-search-profitability] Processing query:', { idea, industry, geo });

    const serpApiKey = Deno.env.get('SERPAPI_API_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const groqApiKey = Deno.env.get('GROQ_API_KEY');

    // Build commercial-intent query
    const commercialTerms = '(buy OR price OR pricing OR best OR "near me" OR discount OR deal OR coupon OR trial OR quote)';
    const query = `${idea} ${industry || ''} ${geo || ''} ${commercialTerms}`.trim();
    
    // ============================
    // 1. Discovery Phase (ONE SerpApi call)
    // ============================
    let searchResults: any = null;
    let organicResults: any[] = [];
    let adsCount = 0;
    let relatedQueries: string[] = [];

    if (!serpApiKey) {
      console.log('[web-search-profitability] No SerpApi key - using mock data');
      // Provide mock data for development
      searchResults = {
        organic_results: [
          { title: 'Example Pricing Page', link: 'https://example.com/pricing', snippet: 'Starting at $19/mo' },
          { title: 'Competitor Features', link: 'https://competitor.com', snippet: 'Best solution for businesses' }
        ],
        ads: [],
        related_searches: []
      };
    } else {
      const params = new URLSearchParams({
        engine: 'google',
        q: query,
        num: '20',
        api_key: serpApiKey,
        gl: geo === 'United States' ? 'us' : (geo?.toLowerCase().substring(0, 2) || 'us'),
        hl: 'en'
      });

      const serpResponse = await fetch(`https://serpapi.com/search?${params}`);
      
      if (!serpResponse.ok) {
        console.error('[web-search-profitability] SerpApi error:', serpResponse.status);
        throw new Error(`SerpApi returned ${serpResponse.status}`);
      }

      searchResults = await serpResponse.json();
    }

    // Extract data from SerpApi results
    organicResults = searchResults.organic_results || [];
    adsCount = (searchResults.ads || []).length + 
                (searchResults.shopping_results || []).length +
                (searchResults.inline_shopping || []).length;
    
    // Extract related commercial queries
    const relatedSearches = searchResults.related_searches || [];
    const peopleAlsoAsk = searchResults.related_questions || [];
    
    relatedQueries = [
      ...relatedSearches.map((r: any) => r.query),
      ...peopleAlsoAsk.map((q: any) => q.question)
    ].filter((q: string) => /buy|price|pricing|best|cost|cheap|discount|deal/i.test(q))
     .slice(0, 6);

    // ============================
    // 2. Evidence Phase (ONE Firecrawl batch, max 3 URLs)
    // ============================
    let competitorEvidence: any[] = [];
    
    // Select top 3 monetizable URLs (prioritize pricing/landing pages)
    const monetizableUrls = organicResults
      .filter((r: any) => r.link && /pricing|price|plans|buy|shop|store/i.test(r.link + r.title))
      .slice(0, 3)
      .map((r: any) => r.link);

    if (firecrawlApiKey && monetizableUrls.length >= 2) {
      console.log('[web-search-profitability] Scraping', monetizableUrls.length, 'URLs with Firecrawl');
      
      try {
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/batch/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            urls: monetizableUrls,
            formats: ['markdown'],
            onlyMainContent: true,
            maxTimeout: 10000
          })
        });

        if (scrapeResponse.ok) {
          const batchData = await scrapeResponse.json();
          
          // Process each scraped page
          for (let i = 0; i < batchData.data?.length && i < monetizableUrls.length; i++) {
            const pageData = batchData.data[i];
            const url = monetizableUrls[i];
            
            if (pageData?.markdown) {
              // Extract pricing info
              const priceMatches = pageData.markdown.match(/\$\d+(?:\.\d{2})?(?:\/mo|\/month|\/yr|\/year)?/gi) || [];
              const hasFreeTier = /free|trial|demo/i.test(pageData.markdown);
              
              competitorEvidence.push({
                url,
                domain: new URL(url).hostname.replace('www.', ''),
                title: organicResults.find((r: any) => r.link === url)?.title || 'Competitor Page',
                snippet: pageData.markdown.substring(0, 300),
                prices: priceMatches.slice(0, 3),
                hasPricing: priceMatches.length > 0,
                hasFreeTier,
                evidence: ['pricing page', 'competitor analysis']
              });
            }
          }
        }
      } catch (error) {
        console.error('[web-search-profitability] Firecrawl batch error:', error);
      }
    }

    // ============================
    // 3. Derived Signals (rule-based, no AI)
    // ============================
    const totalResults = organicResults.length;
    const competitionRatio = totalResults > 0 ? adsCount / (adsCount + totalResults) : 0;
    
    // Competition intensity classification
    let competitionIntensity = 'low';
    if (competitionRatio >= 0.40) competitionIntensity = 'high';
    else if (competitionRatio >= 0.15) competitionIntensity = 'medium';
    
    // Monetization potential classification
    const transactionalQueryCount = relatedQueries.filter(q => 
      /buy|price|pricing|best|near me|discount|deal|coupon|trial|quote/i.test(q)
    ).length;
    const pricingPagesFound = competitorEvidence.filter(e => e.hasPricing).length;
    
    let monetizationPotential = 'low';
    if (transactionalQueryCount >= 3 || pricingPagesFound >= 2) monetizationPotential = 'high';
    else if (transactionalQueryCount >= 1 || pricingPagesFound >= 1) monetizationPotential = 'medium';

    // Identify unmet needs
    const unmetNeeds = relatedQueries.filter(q => {
      const hasAnswer = organicResults.some((r: any) => 
        r.snippet?.toLowerCase().includes(q.toLowerCase().replace(/[?]/g, ''))
      );
      return !hasAnswer;
    }).slice(0, 3);

    // ============================
    // 4. Optional AI Synthesis (only if requested)
    // ============================
    let aiInsights = null;
    if (groqApiKey && competitorEvidence.length > 0) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: 'You are the profitability synthesizer. Analyze commercial intent and competition. Return JSON only.'
              },
              {
                role: 'user',
                content: `Analyze profitability signals for: ${idea}
                Competition ratio: ${competitionRatio}
                Pricing pages found: ${pricingPagesFound}
                Evidence: ${JSON.stringify(competitorEvidence.slice(0, 3))}
                
                Return JSON: { insight: string (max 100 chars), opportunity: string (max 100 chars) }`
              }
            ],
            temperature: 0.3,
            max_tokens: 200
          })
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          try {
            aiInsights = JSON.parse(groqData.choices[0].message.content);
          } catch {
            // If JSON parsing fails, use the raw content
            aiInsights = { insight: groqData.choices[0].message.content.substring(0, 100) };
          }
        }
      } catch (error) {
        console.error('[web-search-profitability] Groq synthesis error:', error);
      }
    }

    // ============================
    // 5. Build Unified Response
    // ============================
    const response = {
      updatedAt: new Date().toISOString(),
      filters: { idea, industry, geo, time_window },
      metrics: [
        {
          name: 'Competition Intensity',
          value: competitionIntensity,
          explanation: `${adsCount} ads vs ${totalResults} organic results (${(competitionRatio * 100).toFixed(0)}%)`,
          confidence: 0.85
        },
        {
          name: 'Monetization Potential',
          value: monetizationPotential,
          explanation: `${transactionalQueryCount} commercial queries, ${pricingPagesFound} pricing pages`,
          confidence: 0.75
        }
      ],
      top_queries: relatedQueries,
      items: competitorEvidence.map(e => ({
        title: e.title,
        snippet: e.snippet,
        url: e.url,
        published: 'unknown',
        source: e.domain,
        evidence: e.evidence,
        prices: e.prices,
        hasPricing: e.hasPricing
      })),
      competitors: competitorEvidence.map(e => ({
        domain: e.domain,
        hasPricing: e.hasPricing,
        hasFreeTier: e.hasFreeTier,
        prices: e.prices
      })),
      citations: [
        { label: 'Google SERP (via SerpApi)', url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, published: 'unknown' },
        ...competitorEvidence.slice(0, 3).map(e => ({
          label: e.domain,
          url: e.url,
          published: 'unknown'
        }))
      ],
      insights: aiInsights,
      unmet_needs: unmetNeeds,
      warnings: !serpApiKey ? ['Using mock data - SerpApi key required for real analysis'] : [],
      cost_estimate: {
        serp_calls: 1,
        firecrawl_urls: competitorEvidence.length,
        total_api_cost: `$${(0.01 + (competitorEvidence.length * 0.001)).toFixed(3)}`
      }
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[web-search-profitability] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
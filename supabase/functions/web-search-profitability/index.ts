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
    const commercialTerms = '(buy OR price OR pricing OR best OR "near me" OR discount OR deal OR coupon OR trial OR quote OR review OR compare)';
    const query = `${idea} ${industry || ''} ${geo || ''} ${commercialTerms}`.trim();
    
    // ============================
    // 1. Discovery Phase (ONE SerpApi call)
    // ============================
    let searchResults: any = null;
    let organicResults: any[] = [];
    let adsCount = 0;
    let relatedQueries: string[] = [];
    let allCompetitors: Map<string, number> = new Map();

    if (!serpApiKey) {
      console.log('[web-search-profitability] No SerpApi key - using mock data');
      // Enhanced mock data for development
      searchResults = {
        organic_results: [
          { 
            title: 'Best P2P Lending Platforms 2024', 
            link: 'https://example.com/best-p2p-lending', 
            snippet: 'Compare top peer-to-peer lending platforms. Rates from 5.99% APR. Fund local businesses with community voting features.'
          },
          { 
            title: 'LendingClub Business Loans', 
            link: 'https://lendingclub.com/business', 
            snippet: 'Get business loans from $5,000 to $500,000. Community-backed funding with transparent terms.'
          },
          { 
            title: 'Funding Circle - Small Business Loans', 
            link: 'https://fundingcircle.com', 
            snippet: 'Peer-to-peer lending for small businesses. Over $10 billion funded. Competitive rates starting at 4.99%.'
          },
          { 
            title: 'Kiva - Crowdfunded Microloans', 
            link: 'https://kiva.org', 
            snippet: '0% interest loans for entrepreneurs. Community voting on loan applications. 96% repayment rate.'
          },
          { 
            title: 'P2P Lending Market Analysis 2024', 
            link: 'https://marketresearch.com/p2p-lending', 
            snippet: 'Market size $150B by 2024. Growth rate 28% CAGR. Key players and emerging trends.'
          }
        ],
        ads: [
          { title: 'Quick Business Loans', description: 'Get funded in 24 hours' },
          { title: 'P2P Investment Platform', description: 'Earn 8-12% returns' }
        ],
        related_searches: [
          { query: 'peer to peer lending rates' },
          { query: 'best p2p lending platforms for investors' },
          { query: 'small business crowdfunding platforms' },
          { query: 'community lending platforms' }
        ],
        related_questions: [
          { question: 'How much can I borrow from P2P lending?' },
          { question: 'What are the risks of peer-to-peer lending?' },
          { question: 'Which P2P platform has the best rates?' }
        ]
      };
    } else {
      const params = new URLSearchParams({
        engine: 'google',
        q: query,
        num: '30', // Increased from 20 to get more results
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

    // Extract comprehensive data from SerpApi results
    organicResults = searchResults.organic_results || [];
    adsCount = (searchResults.ads || []).length + 
                (searchResults.shopping_results || []).length +
                (searchResults.inline_shopping || []).length;
    
    // Extract ALL related queries for better insights
    const relatedSearches = searchResults.related_searches || [];
    const peopleAlsoAsk = searchResults.related_questions || [];
    
    // Get commercial queries
    const commercialQueries = [
      ...relatedSearches.map((r: any) => r.query),
      ...peopleAlsoAsk.map((q: any) => q.question)
    ].filter((q: string) => /buy|price|pricing|best|cost|cheap|discount|deal|review|compare/i.test(q));
    
    // Also get informational queries for unmet needs
    const informationalQueries = [
      ...relatedSearches.map((r: any) => r.query),
      ...peopleAlsoAsk.map((q: any) => q.question)
    ].filter((q: string) => /how|what|why|when|where|can|does|is/i.test(q));
    
    relatedQueries = commercialQueries.slice(0, 10); // Increased from 6

    // Extract ALL competitors from organic results
    organicResults.forEach((result: any) => {
      if (result.link) {
        try {
          const domain = new URL(result.link).hostname.replace('www.', '');
          allCompetitors.set(domain, (allCompetitors.get(domain) || 0) + 1);
        } catch {}
      }
    });

    // ============================
    // 2. Evidence Phase (Firecrawl for top URLs)
    // ============================
    let competitorEvidence: any[] = [];
    
    // Get top 5 diverse URLs (mix of pricing and informational)
    const pricingUrls = organicResults
      .filter((r: any) => r.link && /pricing|price|plans|cost|rates/i.test(r.link + r.title))
      .slice(0, 3)
      .map((r: any) => ({ url: r.link, title: r.title, snippet: r.snippet }));
    
    const reviewUrls = organicResults
      .filter((r: any) => r.link && /review|compare|best|top/i.test(r.link + r.title))
      .slice(0, 2)
      .map((r: any) => ({ url: r.link, title: r.title, snippet: r.snippet }));
    
    const urlsToScrape = [...pricingUrls, ...reviewUrls].slice(0, 5);

    if (firecrawlApiKey && urlsToScrape.length > 0) {
      console.log('[web-search-profitability] Scraping', urlsToScrape.length, 'URLs with Firecrawl');
      
      // Use individual scrape requests instead of batch (more reliable)
      for (const item of urlsToScrape) {
        try {
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: item.url,
              pageOptions: {
                onlyMainContent: true
              }
            })
          });

          if (scrapeResponse.ok) {
            const pageData = await scrapeResponse.json();
            
            if (pageData?.data?.markdown) {
              // Extract pricing info and key features
              const content = pageData.data.markdown;
              const priceMatches = content.match(/\$[\d,]+(?:\.\d{2})?(?:\/mo|\/month|\/yr|\/year|%|\s?APR)?/gi) || [];
              const percentMatches = content.match(/\d+(?:\.\d+)?%(?:\s?APR|\s?interest|\s?return)?/gi) || [];
              const hasFreeTier = /free|trial|demo|no cost|0%/i.test(content);
              
              // Extract key features
              const features = content.match(/✓[^✓\n]+|•[^•\n]+|★[^★\n]+/g) || [];
              
              competitorEvidence.push({
                url: item.url,
                domain: new URL(item.url).hostname.replace('www.', ''),
                title: item.title,
                snippet: content.substring(0, 500),
                prices: [...priceMatches, ...percentMatches].slice(0, 5),
                hasPricing: priceMatches.length > 0 || percentMatches.length > 0,
                hasFreeTier,
                features: features.slice(0, 3).map((f: string) => f.substring(0, 100)),
                evidence: ['scraped content', 'competitor analysis']
              });
            }
          }
        } catch (error) {
          console.error('[web-search-profitability] Firecrawl error for', item.url, error);
        }
      }
    }

    // Add non-scraped results as well for completeness
    const scrapedUrls = new Set(competitorEvidence.map(e => e.url));
    const additionalResults = organicResults
      .filter((r: any) => r.link && !scrapedUrls.has(r.link))
      .slice(0, 10)
      .map((r: any) => ({
        url: r.link,
        domain: (() => {
          try {
            return new URL(r.link).hostname.replace('www.', '');
          } catch {
            return 'unknown';
          }
        })(),
        title: r.title,
        snippet: r.snippet,
        evidence: ['search result'],
        hasPricing: /price|pricing|cost|fee|rate/i.test(r.title + r.snippet)
      }));

    // ============================
    // 3. Derived Signals (enhanced analysis)
    // ============================
    const totalResults = organicResults.length;
    const competitionRatio = totalResults > 0 ? adsCount / (adsCount + totalResults) : 0;
    
    // Competition intensity classification
    let competitionIntensity = 'low';
    if (competitionRatio >= 0.40 || adsCount >= 5) competitionIntensity = 'high';
    else if (competitionRatio >= 0.15 || adsCount >= 2) competitionIntensity = 'medium';
    
    // Monetization potential classification
    const transactionalQueryCount = commercialQueries.length;
    const pricingPagesFound = competitorEvidence.filter(e => e.hasPricing).length;
    const hasEstablishedPlayers = Array.from(allCompetitors.values()).some(count => count >= 3);
    
    let monetizationPotential = 'low';
    if (transactionalQueryCount >= 5 || pricingPagesFound >= 3 || hasEstablishedPlayers) {
      monetizationPotential = 'high';
    } else if (transactionalQueryCount >= 2 || pricingPagesFound >= 1) {
      monetizationPotential = 'medium';
    }

    // Identify unmet needs from informational queries
    const unmetNeeds = informationalQueries
      .filter(q => {
        const hasAnswer = organicResults.some((r: any) => 
          r.snippet?.toLowerCase().includes(q.toLowerCase().replace(/[?]/g, ''))
        );
        return !hasAnswer;
      })
      .slice(0, 5);

    // Market insights
    const marketInsights = {
      averagePricing: competitorEvidence
        .flatMap(e => e.prices || [])
        .filter(p => p.includes('$'))
        .slice(0, 5),
      commonFeatures: competitorEvidence
        .flatMap(e => e.features || [])
        .slice(0, 5),
      topCompetitors: Array.from(allCompetitors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, count]) => ({ domain, appearances: count }))
    };

    // ============================
    // 4. Optional AI Synthesis (enhanced)
    // ============================
    let aiInsights = null;
    if (groqApiKey && (competitorEvidence.length > 0 || organicResults.length > 5)) {
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
                content: 'You are a profitability analyst. Analyze market signals and competition. Be specific and actionable. Return JSON only.'
              },
              {
                role: 'user',
                content: `Analyze profitability for: ${idea}
                Market signals:
                - ${adsCount} ads found (${competitionIntensity} competition)
                - ${transactionalQueryCount} commercial queries
                - ${pricingPagesFound} competitors with pricing
                - Top competitors: ${marketInsights.topCompetitors.slice(0, 3).map(c => c.domain).join(', ')}
                - Price ranges: ${marketInsights.averagePricing.join(', ')}
                
                Return JSON with these exact fields:
                {
                  "marketGap": "specific opportunity (max 150 chars)",
                  "pricingStrategy": "recommended approach (max 150 chars)",
                  "differentiator": "key differentiator needed (max 150 chars)",
                  "quickWin": "immediate action to take (max 150 chars)"
                }`
              }
            ],
            temperature: 0.3,
            max_tokens: 400
          })
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          try {
            aiInsights = JSON.parse(groqData.choices[0].message.content);
          } catch {
            // Parse structured response even if not valid JSON
            const content = groqData.choices[0].message.content;
            aiInsights = {
              marketGap: 'Analysis available - check competitors',
              insight: content.substring(0, 200)
            };
          }
        }
      } catch (error) {
        console.error('[web-search-profitability] Groq synthesis error:', error);
      }
    }

    // ============================
    // 5. Build Comprehensive Response
    // ============================
    const response = {
      updatedAt: new Date().toISOString(),
      filters: { idea, industry, geo, time_window },
      metrics: [
        {
          name: 'Competition Intensity',
          value: competitionIntensity,
          explanation: `${adsCount} ads, ${totalResults} organic results, ${allCompetitors.size} unique competitors`,
          confidence: 0.85
        },
        {
          name: 'Monetization Potential',
          value: monetizationPotential,
          explanation: `${transactionalQueryCount} buyer queries, ${pricingPagesFound} have pricing, ${hasEstablishedPlayers ? 'established market' : 'emerging market'}`,
          confidence: 0.75
        },
        {
          name: 'Market Maturity',
          value: hasEstablishedPlayers ? 'established' : 'emerging',
          explanation: `${allCompetitors.size} competitors found, top player appears ${Math.max(...Array.from(allCompetitors.values()))} times`,
          confidence: 0.70
        }
      ],
      top_queries: relatedQueries,
      items: [...competitorEvidence, ...additionalResults].slice(0, 15), // Show up to 15 results
      competitors: marketInsights.topCompetitors,
      market_insights: {
        pricing_ranges: marketInsights.averagePricing,
        common_features: marketInsights.commonFeatures,
        market_size_indicators: organicResults.filter(r => /market size|billion|million|users|customers/i.test(r.snippet)).slice(0, 3)
      },
      citations: [
        { label: 'Google SERP (via SerpApi)', url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, published: 'real-time' },
        ...competitorEvidence.slice(0, 5).map(e => ({
          label: e.domain,
          url: e.url,
          published: 'recent'
        }))
      ],
      insights: aiInsights,
      unmet_needs: unmetNeeds,
      warnings: !serpApiKey ? ['Using mock data - SerpApi key required for real analysis'] : [],
      cost_estimate: {
        serp_calls: 1,
        firecrawl_urls: competitorEvidence.length,
        total_api_cost: `$${(0.01 + (competitorEvidence.length * 0.001)).toFixed(3)}`,
        data_points: organicResults.length + competitorEvidence.length + relatedQueries.length
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
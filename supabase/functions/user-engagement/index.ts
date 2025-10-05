import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, industry } = await req.json();
    
    console.log('[user-engagement] Analyzing engagement for:', idea);
    
    // Proxy engagement metrics from social signals
    let engagementData = {
      visitors: 10000,
      signups: 800,
      active: 400,
      paid: 120
    };
    
    // Try to get Reddit engagement data
    const redditClientId = Deno.env.get('REDDIT_CLIENT_ID');
    const redditClientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
    
    if (redditClientId && redditClientSecret) {
      try {
        // Get Reddit access token
        const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${redditClientId}:${redditClientSecret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials'
        });
        
        const { access_token } = await tokenResponse.json();
        
        // Search for relevant posts
        const searchResponse = await fetch(
          `https://oauth.reddit.com/search.json?q=${encodeURIComponent(idea)}&limit=25&sort=relevance`,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'User-Agent': 'web:smoothbrains:v1.0 (by /u/meltdown91)'
            }
          }
        );
        
        const searchData = await searchResponse.json();
        
        if (searchData.data?.children) {
          const posts = searchData.data.children;
          const totalComments = posts.reduce((acc: number, post: any) => acc + (post.data.num_comments || 0), 0);
          const totalUpvotes = posts.reduce((acc: number, post: any) => acc + (post.data.ups || 0), 0);
          
          // Estimate funnel based on engagement
          engagementData.visitors = totalUpvotes * 10; // Assume 10% vote
          engagementData.signups = Math.round(totalComments * 2); // Comments indicate higher engagement
          engagementData.active = Math.round(engagementData.signups * 0.5);
          engagementData.paid = Math.round(engagementData.active * 0.3);
        }
      } catch (err) {
        console.error('[user-engagement] Reddit API error:', err);
      }
    }
    
    // Calculate funnel metrics
    const funnelData = [
      { stage: 'Visitors', count: engagementData.visitors, rate: 100 },
      { stage: 'Signups', count: engagementData.signups, rate: Math.round((engagementData.signups / engagementData.visitors) * 100) },
      { stage: 'Active Users', count: engagementData.active, rate: Math.round((engagementData.active / engagementData.signups) * 100) },
      { stage: 'Paid Users', count: engagementData.paid, rate: Math.round((engagementData.paid / engagementData.active) * 100) }
    ];
    
    // Return error - needs real analytics integration
    const retentionData = {
      week1: 0,
      week2: 0,
      week4: 0,
      week8: 0,
      week12: 0
    };
    
    // Identify biggest drop
    const biggestDrop = funnelData.reduce((prev, curr, idx) => {
      if (idx === 0) return prev;
      const dropRate = 100 - curr.rate;
      return dropRate > prev.dropRate ? { stage: curr.stage, dropRate } : prev;
    }, { stage: '', dropRate: 0 });
    
    const response = {
      error: 'User engagement tracking requires analytics integration (Google Analytics, Mixpanel, etc.)',
      updatedAt: new Date().toISOString(),
      metrics: [
        { name: 'Conversion Rate', value: 0, unit: '%', confidence: 0 },
        { name: 'Active Users', value: 0, confidence: 0 },
        { name: 'Churn Rate', value: 0, unit: '%', confidence: 0 },
        { name: 'LTV/CAC', value: 0, confidence: 0 }
      ],
      funnel: [],
      retention: retentionData,
      engagement_sources: [],
      profitLink: null
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[user-engagement] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
import { supabase } from '@/integrations/supabase/client';

// Twitter/X Buzz Adapter
export const twitterBuzzAdapter = async (ctx: any) => {
  const { data, error } = await supabase.functions.invoke('twitter-search', {
    body: {
      query: ctx.idea || ctx.query || '',
      industry: ctx.industry,
      geo: ctx.geography,
      time_window: ctx.timeWindow || 'last_7_days'
    }
  });
  
  if (error) throw error;
  return data;
};

// Amazon Reviews Adapter
export const amazonReviewsAdapter = async (ctx: any) => {
  const { data, error } = await supabase.functions.invoke('amazon-public', {
    body: {
      query: ctx.idea || ctx.query || '',
      industry: ctx.industry,
      category: ctx.category || 'All'
    }
  });
  
  if (error) throw error;
  return data;
};

// Competitor Analysis Adapter  
export const competitorAnalysisAdapter = async (ctx: any) => {
  const { data, error } = await supabase.functions.invoke('competitor-analysis', {
    body: {
      idea: ctx.idea || ctx.query || '',
      industry: ctx.industry,
      geography: ctx.geography
    }
  });
  
  if (error) throw error;
  return data;
};

// Target Audience Adapter
export const targetAudienceAdapter = async (ctx: any) => {
  const { data, error } = await supabase.functions.invoke('dashboard-insights', {
    body: {
      query: ctx.idea || ctx.query || '',
      tileType: 'target_audience',
      filters: ctx
    }
  });
  
  if (error) throw error;
  return data;
};

// Pricing Strategy Adapter
export const pricingStrategyAdapter = async (ctx: any) => {
  const { data, error } = await supabase.functions.invoke('dashboard-insights', {
    body: {
      query: ctx.idea || ctx.query || '',
      tileType: 'pricing_strategy',
      filters: ctx
    }
  });
  
  if (error) throw error;
  return data;
};

// Market Size Adapter
export const marketSizeAdapter = async (ctx: any) => {
  const { data, error } = await supabase.functions.invoke('market-size', {
    body: {
      idea: ctx.idea || ctx.query || '',
      industry: ctx.industry,
      geography: ctx.geography
    }
  });
  
  if (error) throw error;
  
  // Transform the metrics to ensure proper formatting
  if (data?.metrics) {
    data.metrics = data.metrics.map((metric: any) => ({
      ...metric,
      value: metric.unit === 'M' || metric.unit === 'B' 
        ? `$${metric.value}${metric.unit}` 
        : metric.unit === '%'
        ? `${metric.value}%`
        : metric.value,
      explanation: metric.explanation || 
        (metric.name === 'TAM' ? 'Total Addressable Market - The total revenue opportunity available' :
         metric.name === 'SAM' ? 'Serviceable Addressable Market - The segment of TAM you can realistically target' :
         metric.name === 'SOM' ? 'Serviceable Obtainable Market - The portion of SAM you can realistically capture' :
         metric.name === 'CAGR' ? 'Compound Annual Growth Rate - Expected market growth percentage' :
         'Market metric')
    }));
  }
  
  return data;
};

// Growth Projections Adapter
export const growthProjectionsAdapter = async (ctx: any) => {
  const { data, error } = await supabase.functions.invoke('growth-projections', {
    body: {
      idea: ctx.idea || ctx.query || '',
      industry: ctx.industry,
      timeWindow: ctx.timeWindow || 'next_12_months'
    }
  });
  
  if (error) throw error;
  return data;
};

// User Engagement Adapter
export const userEngagementAdapter = async (ctx: any) => {
  const { data, error } = await supabase.functions.invoke('user-engagement', {
    body: {
      idea: ctx.idea || ctx.query || '',
      industry: ctx.industry
    }
  });
  
  if (error) throw error;
  return data;
};

// Launch Timeline Adapter
export const launchTimelineAdapter = async (ctx: any) => {
  const { data, error } = await supabase.functions.invoke('launch-timeline', {
    body: {
      idea: ctx.idea || ctx.query || '',
      projectTrackerConnected: ctx.projectTrackerConnected || false
    }
  });
  
  if (error) throw error;
  return data;
};
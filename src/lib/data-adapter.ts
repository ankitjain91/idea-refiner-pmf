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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STARTUP_IDEAS = [
  // AI & Automation
  { text: "AI-powered mental health companion that detects emotional patterns through voice analysis during daily check-ins", category: "AI & Health", difficulty: "Hard", audience: "Consumers" },
  { text: "Blockchain-based skill verification platform where professionals earn NFT badges from peer reviews", category: "Blockchain", difficulty: "Medium", audience: "Professionals" },
  { text: "Micro-learning app that teaches coding through 5-minute AR puzzles you solve in physical space", category: "EdTech", difficulty: "Hard", audience: "Students" },
  { text: "Carbon credit marketplace for individuals to offset daily activities with verified local green projects", category: "Sustainability", difficulty: "Medium", audience: "Eco-conscious consumers" },
  { text: "AI interior designer that generates room layouts from a photo and your Pinterest boards", category: "AI & Design", difficulty: "Medium", audience: "Homeowners" },
  
  // Marketplaces & Platforms
  { text: "Subscription service for renting high-end work equipment (cameras, tools, instruments) by the hour", category: "Marketplace", difficulty: "Medium", audience: "Freelancers" },
  { text: "Platform connecting retired experts with startups for micro-consulting sessions (15-30 min calls)", category: "Marketplace", difficulty: "Easy", audience: "Startups" },
  { text: "Smart grocery list that predicts what you need based on purchase patterns and recipe history", category: "Consumer Tech", difficulty: "Medium", audience: "Families" },
  { text: "Virtual coworking space with AI-matched accountability partners based on work style and goals", category: "Productivity", difficulty: "Medium", audience: "Remote workers" },
  { text: "Neighborhood tool-sharing app with insurance and damage protection built-in", category: "Sharing Economy", difficulty: "Easy", audience: "Homeowners" },
  
  // Health & Wellness
  { text: "Personalized nutrition app that creates meal plans based on your DNA test and fitness tracker data", category: "Health Tech", difficulty: "Hard", audience: "Health enthusiasts" },
  { text: "Mental wellness check-in app for remote teams with anonymous mood tracking and burnout alerts", category: "HR Tech", difficulty: "Medium", audience: "HR managers" },
  { text: "AI physical therapist that analyzes your movement through phone camera and provides corrections", category: "Health Tech", difficulty: "Hard", audience: "Patients" },
  { text: "Prescription reminder app that syncs with pharmacy and uses smart pill bottles to track adherence", category: "Health Tech", difficulty: "Medium", audience: "Seniors" },
  { text: "Virtual reality meditation experiences that adapt to your heart rate and stress levels", category: "Wellness", difficulty: "Hard", audience: "Stressed professionals" },
  
  // Finance & Crypto
  { text: "Micro-investment app that rounds up crypto purchases and invests spare change in DeFi", category: "FinTech", difficulty: "Medium", audience: "Young investors" },
  { text: "AI tax assistant for freelancers that categorizes expenses from bank statements and receipts", category: "FinTech", difficulty: "Medium", audience: "Freelancers" },
  { text: "Peer-to-peer lending platform for funding local small businesses with community voting", category: "FinTech", difficulty: "Hard", audience: "Local communities" },
  { text: "Subscription management app that negotiates better rates with your existing services", category: "FinTech", difficulty: "Medium", audience: "Consumers" },
  { text: "Carbon-backed cryptocurrency that increases in value as you reduce your carbon footprint", category: "Crypto", difficulty: "Hard", audience: "Eco-investors" },
  
  // B2B & Enterprise
  { text: "AI meeting assistant that generates action items and follows up automatically via Slack", category: "B2B SaaS", difficulty: "Medium", audience: "Teams" },
  { text: "No-code platform for building internal tools that connects to any database or API", category: "B2B SaaS", difficulty: "Hard", audience: "IT departments" },
  { text: "Employee onboarding platform that uses VR to give office tours and training remotely", category: "HR Tech", difficulty: "Hard", audience: "HR departments" },
  { text: "Supply chain transparency tool using blockchain to track product origins for consumers", category: "Enterprise", difficulty: "Hard", audience: "Manufacturers" },
  { text: "AI-powered contract review tool that highlights risks and suggests negotiation points", category: "Legal Tech", difficulty: "Medium", audience: "Legal teams" },
  
  // Social & Community
  { text: "Social network for neighbors to share home improvement costs and bulk buy materials", category: "Social", difficulty: "Easy", audience: "Homeowners" },
  { text: "Dating app that matches based on book preferences and reading habits", category: "Social", difficulty: "Easy", audience: "Book lovers" },
  { text: "Platform for forming micro-communities around very specific interests (like specific TV episodes)", category: "Social", difficulty: "Medium", audience: "Enthusiasts" },
  { text: "App for coordinating group purchases to get wholesale prices on everyday items", category: "Social Commerce", difficulty: "Medium", audience: "Budget-conscious shoppers" },
  { text: "Virtual book club platform with AI discussion facilitator and reading pace matcher", category: "Social", difficulty: "Medium", audience: "Readers" },
  
  // Creative & Content
  { text: "AI music producer that creates custom backing tracks based on your humming", category: "Creative Tech", difficulty: "Hard", audience: "Musicians" },
  { text: "Platform for commissioning personalized children's books with your kids as characters", category: "Creative", difficulty: "Easy", audience: "Parents" },
  { text: "3D printing marketplace for replacement parts of discontinued products", category: "Marketplace", difficulty: "Medium", audience: "Consumers" },
  { text: "AI video editor that automatically creates highlight reels from hours of footage", category: "Creative Tech", difficulty: "Medium", audience: "Content creators" },
  { text: "Collaborative storytelling platform where multiple authors build narratives together", category: "Creative", difficulty: "Easy", audience: "Writers" },
  
  // Travel & Transportation
  { text: "Carpooling app specifically for airport trips with luggage space matching", category: "Transportation", difficulty: "Easy", audience: "Travelers" },
  { text: "Travel planning AI that books everything based on your Instagram saves and Pinterest boards", category: "Travel Tech", difficulty: "Hard", audience: "Millennials" },
  { text: "Platform for swapping vacation homes with verified professionals in your field", category: "Travel", difficulty: "Medium", audience: "Professionals" },
  { text: "Last-minute hotel booking app that uses AI to predict price drops and auto-books", category: "Travel Tech", difficulty: "Medium", audience: "Business travelers" },
  { text: "Virtual travel experiences using 360° videos and local guides for immobile individuals", category: "Travel Tech", difficulty: "Medium", audience: "Seniors/disabled" },
  
  // Food & Beverage
  { text: "Ghost kitchen platform that lets anyone start a delivery-only restaurant from home", category: "Food Tech", difficulty: "Hard", audience: "Home cooks" },
  { text: "AI sommelier that recommends wine based on photos of your meal", category: "Food Tech", difficulty: "Medium", audience: "Wine enthusiasts" },
  { text: "Meal kit service that adapts recipes based on what's already in your fridge", category: "Food Tech", difficulty: "Medium", audience: "Home cooks" },
  { text: "Platform connecting home gardeners with local restaurants to sell micro-greens and herbs", category: "Food Tech", difficulty: "Easy", audience: "Gardeners" },
  { text: "Food waste reduction app that connects restaurants with charities for same-day pickup", category: "Social Impact", difficulty: "Medium", audience: "Restaurants" },
  
  // Gaming & Entertainment
  { text: "Mobile game that teaches financial literacy through managing a virtual business", category: "EdTech Gaming", difficulty: "Medium", audience: "Teens" },
  { text: "AR treasure hunt platform for exploring cities with sponsored prizes from local businesses", category: "Gaming", difficulty: "Medium", audience: "Tourists" },
  { text: "Platform for betting on yourself achieving personal goals with friends as accountability", category: "Gaming", difficulty: "Easy", audience: "Self-improvers" },
  { text: "AI dungeon master for remote D&D games that generates stories based on player choices", category: "Gaming", difficulty: "Hard", audience: "Gamers" },
  { text: "Streaming platform exclusively for indie films with revenue sharing for viewers who promote", category: "Entertainment", difficulty: "Medium", audience: "Film enthusiasts" }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if ideas already exist
    const { data: existingIdeas, error: checkError } = await supabase
      .from('startup_idea_suggestions')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing ideas:', checkError);
      throw checkError;
    }

    // If ideas already exist, don't populate again
    if (existingIdeas && existingIdeas.length > 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Ideas already populated', 
          count: existingIdeas.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert all ideas
    const ideasToInsert = STARTUP_IDEAS.map(idea => ({
      idea_text: idea.text,
      category: idea.category,
      difficulty_level: idea.difficulty,
      target_audience: idea.audience,
      is_active: true
    }));

    const { data: insertedIdeas, error: insertError } = await supabase
      .from('startup_idea_suggestions')
      .insert(ideasToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting ideas:', insertError);
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedIdeas.length} startup ideas`);

    return new Response(
      JSON.stringify({ 
        message: 'Successfully populated startup ideas', 
        count: insertedIdeas.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in populate-startup-ideas:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
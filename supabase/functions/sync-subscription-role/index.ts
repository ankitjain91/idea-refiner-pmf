import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SUBSCRIPTION-ROLE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check for Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    let role: 'free' | 'pro' | 'enterprise' = 'free';
    let stripeCustomerId: string | null = null;
    let subscriptionEnd: string | null = null;
    
    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      stripeCustomerId = customerId;
      logStep("Found Stripe customer", { customerId });

      // Check active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        
        // Determine role based on Stripe product ID
        const productId = subscription.items.data[0].price.product as string;
        
        // Map Stripe product IDs to roles
        switch (productId) {
          case 'prod_T7CsCuGP8R6RrO': // Enterprise Plan
            role = 'enterprise';
            break;
          case 'prod_T7CsnetIz8NE1N': // Pro Plan
            role = 'pro';
            break;
          case 'prod_T7Cs2e5UUZ0eov': // Basic Plan
            role = 'pro'; // Basic plan also gets pro role (no free tier for paid users)
            break;
          default:
            logStep("Unknown product ID, defaulting to pro", { productId });
            role = 'pro'; // Default to pro for any paid subscription
        }
        
        logStep("Subscription found", { role, subscriptionEnd });
      } else {
        logStep("No active subscription");
      }
    } else {
      logStep("No Stripe customer found");
    }

    // Update user role in database using the function
    const { error: syncError } = await supabaseClient.rpc('sync_user_subscription', {
      _user_id: user.id,
      _tier: role,
      _stripe_customer_id: stripeCustomerId,
      _subscription_end: subscriptionEnd
    });

    if (syncError) {
      logStep("Error syncing subscription", syncError);
      throw syncError;
    }

    logStep("Successfully synced subscription role", { role });

    return new Response(
      JSON.stringify({ 
        success: true,
        role,
        subscriptionEnd,
        stripeCustomerId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
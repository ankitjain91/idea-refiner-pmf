import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [
  'https://lovableproject.com',
  'https://*.lovableproject.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be set dynamically
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, falling back to Supabase roles/profiles");

      const { data: roleRow } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: profileRow } = await supabaseClient
        .from('profiles')
        .select('subscription_end_date')
        .eq('user_id', user.id)
        .maybeSingle();

      const role = roleRow?.role as string | undefined;
      const productMap: Record<string, string> = {
        basic: 'prod_T7Cs2e5UUZ0eov',
        pro: 'prod_T7CsnetIz8NE1N',
        enterprise: 'prod_T7CsCuGP8R6RrO',
      };

      if (role && role !== 'free') {
        logStep("Fallback entitlements found", { role, subEnd: profileRow?.subscription_end_date });
        return new Response(JSON.stringify({
          subscribed: true,
          tier: role,
          product_id: productMap[role] ?? null,
          subscription_end: profileRow?.subscription_end_date ?? null
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({
        subscribed: false,
        tier: 'free',
        product_id: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    let hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let tier = 'free';

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product;
      
      // Map product IDs to tiers
      if (productId === 'prod_T7Cs2e5UUZ0eov') tier = 'basic';
      else if (productId === 'prod_T7CsnetIz8NE1N') tier = 'pro';
      else if (productId === 'prod_T7CsCuGP8R6RrO') tier = 'enterprise';
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd,
        tier: tier,
        productId: productId
      });
    } else {
      logStep("No active subscription found - checking Supabase entitlements fallback");

      const { data: roleRow } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: profileRow } = await supabaseClient
        .from('profiles')
        .select('subscription_end_date')
        .eq('user_id', user.id)
        .maybeSingle();

      const role = roleRow?.role as string | undefined;
      const productMap: Record<string, string> = {
        basic: 'prod_T7Cs2e5UUZ0eov',
        pro: 'prod_T7CsnetIz8NE1N',
        enterprise: 'prod_T7CsCuGP8R6RrO',
      };

      if (role && role !== 'free') {
        hasActiveSub = true;
        tier = role;
        productId = productMap[role] ?? null;
        subscriptionEnd = profileRow?.subscription_end_date ?? null;
        logStep("Using fallback entitlements", { tier, productId, subscriptionEnd });
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      tier: tier,
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
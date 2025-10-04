import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const REFERRER_REWARD = 20;
const REFERREE_REWARD = 20;

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const referredUser = url.searchParams.get("referred_user_id");
  if (!code || !referredUser) return new Response(JSON.stringify({ error: "missing params" }), { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: existing, error: selErr } = await supabase
    .from("referrals").select("id,status").eq("code", code).eq("referred_user_id", referredUser).maybeSingle();
  if (selErr) return new Response(JSON.stringify({ error: selErr.message }), { status: 500 });

  if (!existing) {
    const { error } = await supabase.from("referrals").insert({ code, referred_user_id: referredUser, status: "signed_up" });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  } else if (existing.status !== "credited") {
    await supabase.from("referrals").update({ status: "signed_up" }).eq("id", existing.id);
  }

  const { data: codeRow, error: codeErr } = await supabase
    .from("referral_codes").select("referrer_user_id").eq("code", code).single();
  if (codeErr) return new Response(JSON.stringify({ error: codeErr.message }), { status: 500 });

  await supabase.from("credits_ledger").insert([
    { user_id: codeRow.referrer_user_id, delta: REFERRER_REWARD, reason: "referral" },
    { user_id: referredUser, delta: REFERREE_REWARD, reason: "referred_signup" },
  ]);

  await supabase.from("referrals").update({ status: "credited" })
    .eq("code", code).eq("referred_user_id", referredUser);

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});

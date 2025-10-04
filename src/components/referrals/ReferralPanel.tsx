import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ReferralPanel({ userId }: { userId: string }) {
  const [code, setCode] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (!userId) return;
      const { data } = await supabase.from("referral_codes").select("code").eq("referrer_user_id", userId).limit(1).maybeSingle();
      if (data?.code) return setCode(data.code);
      const newCode = (Math.random().toString(36).slice(2, 8) + userId.slice(0,4)).toLowerCase();
      await supabase.from("referral_codes").insert({ code: newCode, referrer_user_id: userId });
      setCode(newCode);
    })();
  }, [userId]);

  const base = typeof window !== "undefined" ? window.location.origin : "https://smoothbrains.ai";
  const url = `${base}/?ref=${code}`;

  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-2">
      <div className="font-semibold">Invite friends — both of you get 20 credits</div>
      <input className="w-full rounded border px-3 py-2" readOnly value={url} onFocus={(e)=>e.currentTarget.select()} />
      <div className="flex gap-2">
        <a className="rounded px-3 py-2 border" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Get free AI credits on SmoothBrains")}&url=${encodeURIComponent(url)}`} target="_blank">Share X</a>
        <a className="rounded px-3 py-2 border" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank">Share LinkedIn</a>
        <button className="rounded px-3 py-2 border" onClick={() => navigator.clipboard.writeText(url)}>Copy</button>
      </div>
    </div>
  );
}

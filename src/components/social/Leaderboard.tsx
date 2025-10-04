import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Leaderboard() {
  const [rows, setRows] = useState<{handle: string; referrals: number}[]>([]);
  useEffect(() => { (async () => {
    const { data, error } = await supabase.rpc("top_referrers");
    if (!error && data) setRows(data);
  })(); }, []);
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-lg font-semibold mb-2">Top Referrers (weekly)</div>
      <ol className="space-y-1 list-decimal pl-5">
        {rows.map((r, i) => (<li key={i}><span className="font-medium">{r.handle || "anonymous"}</span> — {r.referrals} joins</li>))}
      </ol>
    </div>
  );
}

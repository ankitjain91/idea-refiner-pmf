import { useEffect, useState } from "react";
export function StreakBadge() {
  const [streak, setStreak] = useState<number>(() => Number(localStorage.getItem("sb_streak") || 1));
  useEffect(() => {
    const k = "sb_last_seen"; const today = new Date().toDateString();
    const last = localStorage.getItem(k);
    if (!last) { localStorage.setItem(k, today); return; }
    const diff = (new Date(today).getTime() - new Date(last).getTime())/86400000;
    if (diff >= 1 && diff < 2) {
      const s = (Number(localStorage.getItem("sb_streak") || 1) + 1);
      localStorage.setItem("sb_streak", String(s)); setStreak(s);
    }
    localStorage.setItem(k, today);
  }, []);
  return <span className="rounded-full px-2 py-1 text-xs bg-black/5 border">🔥 Streak {streak}d</span>;
}

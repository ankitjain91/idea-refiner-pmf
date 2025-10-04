# SmoothBrains — Clean + Viral-Ready Pack

## What's included
- Share buttons: `src/components/shared/ShareButtons.tsx`
- Virality tile: `src/components/tiles/ViralityScoreTile.tsx`
- Referrals UI: `src/components/referrals/ReferralPanel.tsx`
- Leaderboard + Streak: `src/components/social/Leaderboard.tsx`, `src/components/social/StreakBadge.tsx`
- Supabase migrations: `supabase/migrations/20251004_referrals.sql`, `20251004_top_referrers.sql`
- Edge function: `supabase/functions/referrals/index.ts`
- Analytics page: `app/analytics/page.tsx` or `pages/analytics.tsx` (created depending on your router)
- QuickStatsStrip empty-state fix: ['src/components/hub/QuickStatsStrip.tsx']

## How to integrate (quick)
1. Add `ShareButtons` to tiles in `src/components/hub/ExtendedInsightsGrid.tsx`.
2. Import and place `ViralityScoreTile` in `src/components/hub/MainAnalysisGrid.tsx`.
3. Render `ReferralPanel` on your hub sidebar/header with `userId` prop.
4. After signup, detect `?ref=` and call `/functions/v1/referrals?code=...&referred_user_id=...`.
5. Apply migrations in Supabase; deploy edge function with env `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
6. Visit `/analytics` to view basic referral stats.

## ENV
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

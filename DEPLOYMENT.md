# Deployment Guide

This document outlines how to deploy the Idea Refiner PMF app (Vite + React + Supabase Edge Functions).

## 1. Prerequisites
- Node 18+ (bun optional for local dev)
- Supabase project created
- OpenAI API key (for title & idea/chat functions)
- GitHub repo connected (for Vercel/Netlify)

## 2. Environment Variables
Set these in your hosting provider AND in Supabase dashboard (Edge Functions that need them):

| Variable | Location | Purpose |
|----------|----------|---------|
| VITE_SUPABASE_URL | Frontend | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | Frontend | Public anon key |
| OPENAI_API_KEY | Supabase Edge Functions | Title generation & AI chat |
| SERVICE_ROLE_KEY (optional) | Supabase Functions (secure contexts) | Only if needed for server tasks |

In Vercel: Project Settings → Environment Variables. In Netlify: Site Settings → Build & Deploy → Environment.

## 3. Build Command
```
npm install
npm run build
```
Output directory: `dist`

## 4. Deploy Frontend
### Option A: Vercel
1. Import GitHub repo.
2. Framework: Other (or Vite). Build Command: `npm run build`. Output: `dist`.
3. Add env vars.
4. Deploy.

### Option B: Netlify
1. New Site from Git → pick the repo.
2. Build: `npm run build` Publish: `dist`.
3. Add env vars.
4. Deploy.

### Option C: Static Bucket / CDN
1. Run build locally.
2. Upload `dist/` to S3 / CloudFront / Azure Static Web Apps (adjust routing).

## 5. Supabase Edge Functions
Deploy each function (from repo root, ensure `supabase` CLI is installed):
```
supabase functions deploy generate-session-title --project-ref <PROJECT_REF>
supabase functions deploy generate-session-name --project-ref <PROJECT_REF>
supabase functions deploy idea-chat --project-ref <PROJECT_REF>
# ... deploy others as needed
```
Grant anon access only where expected (check `config.toml`).

## 6. Database Migrations
If migrations exist in `supabase/migrations/`, push them:
```
supabase db push --project-ref <PROJECT_REF>
```

## 7. Routing & SPA Fallback
Ensure a single-page app fallback:
- Netlify: `_redirects` file → `/* /index.html 200`
- Vercel: Add `"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]` in `vercel.json` (if needed)

## 8. Performance Optimizations Applied
- Manual chunk splitting added in `vite.config.ts` to reduce initial JS bundle.
- Source maps disabled in production for smaller artifact.

## 9. Post-Deployment Checklist
- Auth flow works after hard refresh at `/dashboard`.
- Creating idea generates session name (two-word AI title).
- Session reload persists chat & analysis.
- Supabase Edge Functions logs show successful invocations.
- No 404s for internal routes on deep link.

## 10. Rollback Strategy
- Keep previous successful deployment (Vercel/Netlify maintain history).
- Tag releases in Git: `git tag -a vX.Y.Z -m "Deploy" && git push --tags`.

## 11. Monitoring Ideas
- Use Supabase logs for function errors.
- Consider adding client logging (Sentry) in future.

## 12. Troubleshooting
| Issue | Cause | Fix |
|-------|-------|-----|
| 401 on functions | Missing/invalid JWT or verify_jwt mismatch | Adjust `config.toml` or add auth header |
| Session title not generating | Missing OPENAI_API_KEY | Set env var in Supabase | 
| Chat not restoring | State not saved yet | Interact to trigger autosave then reload |
| Large JS warning | Bundle size baseline | Already split; further: dynamic import heavy components |

## 13. Future Improvements
- Add SSR (e.g., Remix) for better SEO.
- Introduce edge caching for public marketing pages.
- Add health endpoint & synthetic check.

---
Happy deploying! 🎯

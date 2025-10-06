# AI Credits Tracking System

## Overview
Comprehensive AI credits tracking system that monitors AI/LLM usage across the application and enforces subscription limits.

## Implementation Summary

### Backend Tracking (Edge Functions)

#### Credits Cost Structure
- **idea-chat**: 15 credits per message (main chat interface)
- **groq-conversation-summary**: 10 credits per summary
- **generate-suggestions**: 5 credits per generation
- **tile-ai-chat**: 25 credits per tile analysis
- **data-hub**: 2 credits per tile generated (dashboard generation)

#### Edge Functions Updated
1. ✅ **idea-chat** - Tracks 15 credits per user message
2. ✅ **groq-conversation-summary** - Tracks 10 credits per summary
3. ✅ **generate-suggestions** - Tracks 5 credits per suggestion generation
4. ✅ **tile-ai-chat** - Tracks 25 credits per tile chat
5. ✅ **data-hub** - Tracks 2 credits per tile (dashboard generation)

#### Tracking Implementation
Each edge function now:
- Gets current billing period via `get_current_billing_period()` RPC
- Increments `ai_credits_used` via `increment_usage()` RPC
- Logs detailed usage to `ai_credits_usage` table with:
  - `user_id`
  - `operation_type` (function name)
  - `credits_used`
  - `billing_period_start`
  - `billing_period_end`

### Frontend Enforcement

#### Pre-flight Checks
- **EnhancedIdeaChat**: Checks AI credits before sending messages
- Shows error toast when limit reached
- Prevents API calls if insufficient credits
- Dashboard tiles: To be implemented

#### Usage Display Components
1. **AICreditsUsageCard**: 
   - Shows total credits used vs limit
   - Progress bar visualization
   - Breakdown by operation type
   - Warning alerts at 80% and 100% usage
   - Auto-refreshes when usage changes

2. **Dashboard Integration**:
   - AI Credits card shows usage/limit
   - Real-time progress tracking
   - Visual indicators for high usage

### Subscription Tier Limits

```typescript
Free:       50 credits/month
Basic:     500 credits/month
Pro:     3,000 credits/month
Enterprise: 10,000 credits/month
```

### Credit Cost Formula

**Based on actual API costs:**
- Groq llama-3.1-8b: ~$0.00005 per 1K tokens
- Groq llama-3.3-70b: ~$0.0005 per 1K tokens
- Lovable AI gemini-flash: FREE until Oct 13, then ~$0.0001 per 1K tokens

**Credit-to-Cost Mapping:**
- 1 credit = $0.001 (conservative)
- Provides ~30% margin for edge cases

### Database Schema

#### ai_credits_usage table
- `id`: UUID
- `user_id`: UUID
- `operation_type`: TEXT (function name)
- `credits_used`: INTEGER
- `billing_period_start`: TIMESTAMP
- `billing_period_end`: TIMESTAMP
- `created_at`: TIMESTAMP
- `session_id`: UUID (optional)

#### usage_limits table (existing)
- `ai_credits_used`: INTEGER - Running total for current period

## Next Steps

### Phase 2: Complete Coverage
1. Add tracking to `tile-ai-chat` edge function (25 credits)
2. Add tracking to all data-hub orchestrator functions:
   - `competitive-landscape`: 8 credits
   - `market-size-analysis`: 6 credits
   - `market-trends`: 6 credits
   - `financial-analysis`: 6 credits
   - Tile refreshes: 2 credits each

3. Implement dashboard tile pre-flight checks

### Phase 3: Optimization
1. **LLM Caching**:
   - Use `llm-cache.ts` wrapper for frequently requested data
   - Cache duration: 15min for chat, 60min for market data
   - Reduce redundant API calls

2. **Rate Limiting**:
   - Max 10 chat messages per minute
   - Max 5 tile refreshes per minute
   - Prevent spam/abuse

3. **Smart Batching**:
   - Batch dashboard tile refreshes
   - Single AI call for multiple tiles where possible

### Phase 4: Analytics
1. Add usage analytics dashboard
2. Show credit consumption trends
3. Predict when user will hit limits
4. Recommend optimal tier based on usage patterns

## Testing Checklist

- [ ] Chat messages increment credits correctly
- [ ] Summary generation increments credits
- [ ] Suggestion generation increments credits
- [ ] Pre-flight checks prevent API calls when at limit
- [ ] Usage card displays correct breakdown
- [ ] Credits reset at start of billing period
- [ ] Error handling for failed credit tracking
- [ ] Toast notifications work correctly
- [ ] Dashboard progress bars update in real-time

## Migration Notes

- Existing users will have `ai_credits_used = 0` initially
- Credits start tracking immediately after deployment
- No retroactive charging for previous usage
- Billing period aligns with subscription renewal

## Cost Estimates by Tier

**Free Tier (50 credits):**
- ~3-4 chat conversations with summaries
- Actual cost to us: ~$0.05/month
- User value: Trial/MVP validation

**Basic Tier (500 credits):**
- ~30-35 chat conversations
- Actual cost: ~$0.50/month
- Revenue: $12/month
- Margin: 96%

**Pro Tier (3,000 credits):**
- ~200 conversations + dashboard tiles
- Actual cost: ~$3.00/month
- Revenue: $29/month
- Margin: 90%

**Enterprise Tier (10,000 credits):**
- ~650+ conversations + extensive tile usage
- Actual cost: ~$10.00/month
- Revenue: $99/month
- Margin: 90%

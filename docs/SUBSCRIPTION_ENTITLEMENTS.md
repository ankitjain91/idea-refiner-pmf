# SmoothBrains Subscription & Entitlements System

## Overview

Your SmoothBrains app now has a comprehensive subscription and entitlements system that gates features based on user tiers and tracks usage limits.

## Subscription Tiers

### 🧠 Free ($0)
- **Ideas**: 2 per month
- **AI Credits**: 50 per month
- **Refresh**: Manual only
- **Exports**: 0
- **Seats**: 1
- **Projects**: 1
- **Features**: Read-only dashboard, basic market trends, simple Reddit sentiment, news headlines

### 🧩 Basic ($12/month)
- **Ideas**: 10 per month
- **AI Credits**: 500 per month
- **Refresh**: Auto every 24h
- **Exports**: 3 per month
- **Seats**: 1
- **Projects**: 3
- **Features**: All Free features + market size analysis, competition overview, report exports

### 🚀 Pro ($29/month)
- **Ideas**: Unlimited
- **AI Credits**: 3,000 per month
- **Refresh**: Auto every 6h
- **Exports**: 20 per month
- **Seats**: 3
- **Projects**: Unlimited
- **Features**: All Basic features + AI recommendations, trend forecasting, batch analysis, collaboration

### 🏆 Enterprise ($99/month)
- **Ideas**: Unlimited
- **AI Credits**: 10,000 per month
- **Refresh**: Auto every 1h
- **Exports**: Unlimited
- **Seats**: 10+ with SSO
- **Projects**: Unlimited
- **Features**: All Pro features + API access, white-label reports, priority processing, custom data sources, SLA

## Database Schema

### Tables Created

#### `usage_limits`
Tracks current billing period usage for each user:
- `ideas_used`: Number of ideas created this month
- `ai_credits_used`: AI credits consumed this month
- `exports_used`: Number of exports this month
- `seats_used`: Number of seats in use
- `projects_used`: Number of projects created
- `billing_period_start/end`: Current billing period boundaries

#### `ai_credits_usage`
Detailed log of AI credit consumption:
- `credits_used`: Amount consumed
- `operation_type`: 'chat', 'analysis', 'batch', 'competition', etc.
- `session_id`: Reference to analysis session
- `billing_period_start/end`: When the credits were used

#### `exports_usage`
Log of all exports:
- `export_type`: 'pdf', 'csv', 'json'
- `idea_id`: Which idea was exported
- `billing_period_start/end`: When the export occurred

## Usage Tracking Functions

### `increment_usage(user_id, type, amount)`
Increments usage counters. Types: 'ideas', 'ai_credits', 'exports', 'projects'

### `initialize_usage_limits(user_id)`
Automatically initializes or resets usage limits at the start of each billing period

## React Context API

### `useSubscription()` Hook

Returns:
- `subscription`: Current tier info (tier, product_id, subscription_end)
- `usage`: Current usage stats
- `loading`: Whether subscription data is loading
- `canAccess(feature)`: Check if user can access a feature
- `getRemainingIdeas()`: Get remaining ideas for the month
- `getRemainingAICredits()`: Get remaining AI credits
- `getRemainingExports()`: Get remaining exports
- `canUseFeature(feature)`: Check if feature can be used (returns {allowed, reason})
- `incrementUsage(type, amount)`: Increment usage counter
- `refreshUsage()`: Refresh usage data from database
- `checkSubscription()`: Verify subscription with Stripe

### Example Usage

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function MyComponent() {
  const { canUseFeature, incrementUsage, getRemainingAICredits } = useSubscription();
  
  const handleAnalysis = async () => {
    // Check if user can use AI credits
    const check = canUseFeature('use_ai_credits');
    if (!check.allowed) {
      toast({
        title: 'Limit Reached',
        description: check.reason,
        variant: 'destructive'
      });
      return;
    }
    
    // Perform analysis...
    await doAnalysis();
    
    // Increment AI credits usage (e.g., 10 credits per analysis)
    await incrementUsage('ai_credits', 10);
  };
  
  return (
    <div>
      <p>Remaining AI Credits: {getRemainingAICredits()}</p>
      <Button onClick={handleAnalysis}>Run Analysis</Button>
    </div>
  );
}
```

## Components

### `<UpgradeNudge />`
Shows upgrade prompts when users hit limits:

```tsx
import { UpgradeNudge } from '@/components/subscription/UpgradeNudge';

<UpgradeNudge
  reason="You've used all your AI credits for this month"
  currentTier="basic"
  suggestedTier="pro"
  feature="AI Analysis"
/>
```

### `<UsageBar />`
Displays visual progress bars for all usage metrics:

```tsx
import { UsageBar } from '@/components/subscription/UsageBar';

<UsageBar />
```

## Feature Gating Examples

### 1. Gate Idea Creation

```typescript
const handleCreateIdea = async () => {
  const check = canUseFeature('create_idea');
  if (!check.allowed) {
    return <UpgradeNudge reason={check.reason} currentTier={subscription.tier} />;
  }
  
  // Create idea...
  await createIdea(data);
  await incrementUsage('ideas');
};
```

### 2. Gate AI Features

```typescript
const handleAIChat = async (message: string) => {
  const creditsNeeded = 5; // 5 credits per message
  const remaining = getRemainingAICredits();
  
  if (remaining < creditsNeeded) {
    toast({
      title: 'Insufficient AI Credits',
      description: `This operation requires ${creditsNeeded} credits. You have ${remaining} remaining.`,
      action: <Button onClick={() => navigate('/pricing')}>Upgrade</Button>
    });
    return;
  }
  
  // Process AI chat...
  const response = await aiChat(message);
  await incrementUsage('ai_credits', creditsNeeded);
  
  return response;
};
```

### 3. Gate Exports

```typescript
const handleExport = async (type: 'pdf' | 'csv') => {
  const check = canUseFeature('export');
  if (!check.allowed) {
    return <UpgradeNudge 
      reason={check.reason} 
      currentTier={subscription.tier}
      suggestedTier="basic" 
    />;
  }
  
  // Generate export...
  await generateExport(type);
  
  // Log export
  await supabase.from('exports_usage').insert({
    user_id: user.id,
    export_type: type,
    idea_id: currentIdea.id,
    billing_period_start: new Date(),
    billing_period_end: addMonths(new Date(), 1)
  });
  
  await incrementUsage('exports');
};
```

## AI Credit Pricing Guide

Suggested credit costs for different operations:

- **Simple AI Chat**: 5 credits per message
- **Idea Analysis**: 20 credits
- **Competition Deep-Dive**: 50 credits
- **Financial Projections**: 30 credits
- **Batch Analysis** (multiple ideas): 100 credits
- **Trend Forecasting**: 40 credits
- **AI Recommendations**: 15 credits

## Stripe Integration

### Product IDs
- Basic: `prod_T7Cs2e5UUZ0eov`
- Pro: `prod_T7CsnetIz8NE1N`
- Enterprise: `prod_T7CsCuGP8R6RrO`

### Price IDs
- Basic: `price_1SAySTJtb0GRtBUmTWxAeuKJ`
- Pro: `price_1SAySeJtb0GRtBUmYQ36t8rG`
- Enterprise: `price_1SAySoJtb0GRtBUm7TgSNxQt`

### Edge Functions
- `check-subscription`: Validates subscription status with Stripe
- `create-checkout`: Creates Stripe checkout session
- `customer-portal`: Opens Stripe customer portal for subscription management

## Monthly Reset

Usage limits automatically reset at the start of each billing period. The `initialize_usage_limits` function checks if the current date is past the `billing_period_end` and resets counters accordingly.

## Add-Ons (Future Enhancement)

To implement add-ons:

1. Create new Stripe products for add-ons:
   - Extra AI credits: $10 for +3,000 credits
   - Extra seats: $5 per seat
   - Real-time refresh: $15/month

2. Store add-on purchases in a new `subscription_addons` table

3. Modify usage limit checks to include add-on credits

## Testing Subscription Flow

1. **Free Tier**: Default for all new users
2. **Upgrade**: Click "Get Started" on any paid tier in /pricing
3. **Stripe Checkout**: Opens in new tab
4. **Webhook** (if configured): Updates subscription on payment success
5. **Manual Refresh**: Click "Refresh Status" button to sync with Stripe

## Security Notes

- All usage tracking uses RLS policies
- Only service role can modify usage limits
- Users can only view their own usage data
- Stripe subscription validation happens server-side via edge function

## Next Steps

1. **Implement AI Credit Deductions**: Add `incrementUsage('ai_credits', amount)` calls to all AI operations
2. **Add Export Gating**: Check export limits before generating reports
3. **Show Usage UI**: Add `<UsageBar />` component to dashboard
4. **Test Upgrade Flow**: Purchase a subscription in Stripe test mode
5. **Monitor Usage**: Query `usage_limits` table to see real usage patterns

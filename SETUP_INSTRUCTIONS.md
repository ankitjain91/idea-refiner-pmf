# Enterprise Authentication Setup Instructions

## ✅ Completed Setup
- Enhanced authentication system with roles (free, pro, enterprise)
- Protected routes and session management
- User menu with role display
- Stripe sync edge function for subscription roles

## 📋 Required Configuration Steps

### 1. Google OAuth Setup (Required for Google Sign-in)

1. **In Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to "Credentials" → Create OAuth 2.0 Client ID
   - Set Application Type: "Web application"
   - Add Authorized JavaScript Origins:
     - `https://wppwfiiomxmnjyokxnin.supabase.co`
     - Your app URL (e.g., `https://quantilslab.io`)
   - Add Authorized Redirect URIs:
     - `https://wppwfiiomxmnjyokxnin.supabase.co/auth/v1/callback`

2. **In Supabase Dashboard:**
   - Go to [Authentication Providers](https://supabase.com/dashboard/project/wppwfiiomxmnjyokxnin/auth/providers)
   - Enable Google provider
   - Add your Google Client ID and Secret from step 1

3. **Configure Redirect URLs:**
   - Go to [URL Configuration](https://supabase.com/dashboard/project/wppwfiiomxmnjyokxnin/auth/url-configuration)
   - Site URL: Your production URL (e.g., `https://quantilslab.io`)
   - Redirect URLs: Add both:
     - Your production URL: `https://quantilslab.io/*`
     - Preview URL: `https://*.lovableproject.com/*`

### 2. Stripe Product Mapping (Required for Subscriptions)

Update the `sync-subscription-role` edge function (lines 70-80) with your actual Stripe product IDs:

```typescript
// Example mapping - replace with your actual Stripe product IDs
if (productId === 'prod_YOUR_ENTERPRISE_ID' || subscription.items.data[0].price.unit_amount! >= 100000) {
  role = 'enterprise';
} else if (productId === 'prod_YOUR_PRO_ID' || subscription.items.data[0].price.unit_amount! >= 30000) {
  role = 'pro';
} else {
  role = 'pro'; // Default to pro for any paid subscription
}
```

### 3. Email Confirmation (Optional - Faster Testing)

For faster development/testing:
- Go to [Auth Settings](https://supabase.com/dashboard/project/wppwfiiomxmnjyokxnin/auth/configuration)
- Disable "Confirm email" under Email Auth

## 🔒 Security Features Implemented

- Row-Level Security (RLS) on all user tables
- Secure role checking via database functions
- Session persistence with auto-refresh
- Protected routes with auth guards
- Stripe webhook-free subscription syncing

## 🎯 Features Ready to Use

- **Email/Password Authentication** ✅
- **Google OAuth** (after configuration above)
- **Role-based Access Control** ✅
- **Session Persistence** ✅
- **Protected Dashboard** ✅
- **Stripe Subscription Sync** ✅
- **User Profile Management** ✅

## 📝 Notes

- The system automatically creates a 'free' role for new users
- Subscription status syncs when users log in or refresh
- The edge function logs are available at: [Function Logs](https://supabase.com/dashboard/project/wppwfiiomxmnjyokxnin/functions/sync-subscription-role/logs)
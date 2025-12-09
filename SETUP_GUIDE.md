# DiabetesCare App - Complete Setup Guide

This guide will walk you through setting up the DiabetesCare app from scratch to production-ready.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Supabase Setup](#supabase-setup)
4. [Stripe Configuration](#stripe-configuration)
5. [AI API Setup](#ai-api-setup)
6. [Installing Dependencies](#installing-dependencies)
7. [Running the App](#running-the-app)
8. [Deployment](#deployment)
9. [Testing](#testing)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g expo-cli`)
- **Git**

You will also need accounts for:

- [Supabase](https://supabase.com) (Database & Auth)
- [Stripe](https://stripe.com) (Payment Processing)
- [Anthropic](https://anthropic.com) OR [OpenAI](https://openai.com) (AI Food Analysis)

---

## Environment Configuration

### Step 1: Copy the Environment Template

```bash
cp .env.example .env
```

### Step 2: Configure Environment Variables

Open `.env` and fill in all the required values:

#### Supabase Configuration

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**How to get these:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to Settings > API
4. Copy the Project URL, anon/public key, and service_role key

#### Stripe Configuration

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**How to get these:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers > API keys
3. Copy your Publishable key and Secret key
4. For webhook secret: Developers > Webhooks > Add endpoint
   - Endpoint URL: `https://your-supabase-url.supabase.co/functions/v1/stripe-webhook`
   - Events to listen: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the webhook signing secret

#### AI API Keys

Choose ONE or BOTH:

**Option 1: Anthropic Claude (Recommended)**
```env
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

Get your key at: https://console.anthropic.com/settings/keys

**Option 2: OpenAI**
```env
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```

Get your key at: https://platform.openai.com/api-keys

#### Optional: Food Database APIs

For enhanced nutrition data:

```env
EXPO_PUBLIC_USDA_API_KEY=your_usda_key
EXPO_PUBLIC_NUTRITIONIX_APP_ID=your_app_id
EXPO_PUBLIC_NUTRITIONIX_APP_KEY=your_app_key
```

---

## Supabase Setup

### Step 1: Run Database Migrations

All migrations are in the `supabase/migrations/` folder. They need to be applied to your Supabase database.

**Option A: Using Supabase Studio (Web UI)**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open each migration file and run them in order (oldest first)

**Option B: Using Supabase CLI**
```bash
npx supabase migration up
```

### Step 2: Enable Row Level Security

Ensure RLS is enabled for all tables (this should be done by migrations, but verify):

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`.

### Step 3: Configure Authentication

1. Go to Authentication > Settings
2. **Disable Email Confirmation** (or configure SMTP if you want it enabled)
3. Set Password Requirements:
   - Minimum length: 8
   - Require uppercase: Yes
   - Require lowercase: Yes
   - Require numbers: Yes
4. Configure Password Reset:
   - Redirect URL: `your-app-url://auth/reset-password`

### Step 4: Deploy Edge Functions

The app uses several Supabase Edge Functions:

```bash
# Deploy all edge functions
npx supabase functions deploy stripe-checkout
npx supabase functions deploy stripe-webhook
npx supabase functions deploy food-api
npx supabase functions deploy redeem-promo-code
```

Make sure to set environment secrets for edge functions:

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Stripe Configuration

### Step 1: Create Products and Prices

You need to create three subscription products in Stripe:

**Standard Plan (Free)**
- Price: $0.00/month
- Price ID: Update in `src/stripe-config.ts`

**Gold Plan**
- Price: $9.99/month
- Price ID: Update in `src/stripe-config.ts`

**Diamond Plan**
- Price: $15.00/month
- Price ID: Update in `src/stripe-config.ts`

### Step 2: Update Stripe Config

Edit `src/stripe-config.ts` and replace the `priceId` and `productId` values with your actual Stripe IDs:

```typescript
export const products: Product[] = [
  {
    priceId: 'price_YOUR_STANDARD_ID',
    productId: 'prod_YOUR_STANDARD_ID',
    // ...
  },
  // ... update all three products
];
```

### Step 3: Test Payments

Use Stripe test cards:

- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`

---

## AI API Setup

### Anthropic Claude (Recommended)

1. Sign up at https://console.anthropic.com
2. Create an API key
3. Add to `.env`: `EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...`
4. Model used: `claude-3-5-sonnet-20241022`

### OpenAI (Alternative)

1. Sign up at https://platform.openai.com
2. Create an API key
3. Add to `.env`: `EXPO_PUBLIC_OPENAI_API_KEY=sk-...`
4. Model used: `gpt-4-vision-preview`

**Note:** The app will automatically use whichever key is available. If both are set, Anthropic is preferred.

---

## Installing Dependencies

```bash
npm install
```

This will install all required packages including:
- Expo SDK
- Supabase client
- Stripe (for web)
- React Navigation
- Camera and image processing libraries
- PDF generation libraries

---

## Running the App

### Development Mode

**Web:**
```bash
npm run web
```

**iOS Simulator:**
```bash
npm run ios
```

**Android Emulator:**
```bash
npm run android
```

**Physical Device (Tunnel Mode):**
```bash
npm run tunnel
```

### Production Build

**Web:**
```bash
npm run build
```

**iOS:**
```bash
eas build --platform ios
```

**Android:**
```bash
eas build --platform android
```

---

## Deployment

### Web Deployment (Netlify/Vercel)

1. Build the web version:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder to your hosting service

3. Set environment variables in your hosting dashboard

### Mobile Deployment (EAS)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Configure EAS:
   ```bash
   eas build:configure
   ```

3. Submit to App Store/Play Store:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

---

## Testing

### Testing Payments

1. Enable Stripe test mode
2. Use test cards: https://stripe.com/docs/testing
3. Verify webhooks are received in Stripe Dashboard

### Testing AI Food Analysis

1. Take a photo of food
2. Check console logs for AI API calls
3. Verify nutritional data is accurate

### Testing Authentication

1. Sign up with a test email
2. Test login/logout
3. Test password reset flow
4. Verify RLS policies work (users can only see their own data)

---

## Troubleshooting

### Issue: "Stripe is not configured"

**Solution:** Make sure `STRIPE_SECRET_KEY` is set in `.env` and doesn't contain the default placeholder value.

### Issue: "AI analysis returns mock data"

**Solution:** Verify that either `EXPO_PUBLIC_ANTHROPIC_API_KEY` or `EXPO_PUBLIC_OPENAI_API_KEY` is set correctly in `.env`.

### Issue: "Database connection failed"

**Solution:**
1. Check that Supabase URL and keys are correct
2. Verify your Supabase project is not paused
3. Check that RLS policies are properly configured

### Issue: "Webhooks not being received"

**Solution:**
1. Verify webhook endpoint URL is correct in Stripe Dashboard
2. Check that Edge Function is deployed: `npx supabase functions list`
3. View Edge Function logs: `npx supabase functions logs stripe-webhook`

---

## Production Checklist

Before launching to production:

- [ ] All environment variables configured in production
- [ ] Database migrations applied
- [ ] RLS policies tested and verified
- [ ] Stripe products created and IDs updated
- [ ] Webhook endpoints configured and tested
- [ ] Edge Functions deployed
- [ ] Email provider configured (if using email verification)
- [ ] Privacy policy page created
- [ ] Terms of service page created
- [ ] Medical disclaimer added
- [ ] Test all payment flows
- [ ] Test AI food analysis with real images
- [ ] Test authentication flows
- [ ] Build and test on real devices
- [ ] Set up error tracking (Sentry recommended)
- [ ] Set up analytics (optional)
- [ ] App Store / Play Store listing prepared
- [ ] HIPAA compliance reviewed (if applicable)

---

## Support

For issues or questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Review Supabase logs in Dashboard
3. Check Stripe webhook logs
4. Review Edge Function logs: `npx supabase functions logs`

---

## License

[Your License Here]

---

**Last Updated:** December 2025

# Stripe Subscription System Setup Guide

This guide walks you through setting up the complete Stripe subscription system for your diabetes care app.

## Overview

The subscription system includes:
- **Free Plan**: $0 (5 scans/day, basic features)
- **Gold Plan**: $10/month (unlimited scans, advanced features)
- **Diamond Plan**: $15/month OR $79/year (first year), $89/year (renewals)
- **Family Plan**: $20/month (2 Diamond accounts with shared features)

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Supabase project with database access
- Access to your app's environment variables

## Step 1: Create Stripe Products

### 1.1 Gold Plan

1. Go to Stripe Dashboard → Products
2. Click "Add product"
3. Fill in:
   - **Name**: Gold Plan
   - **Description**: Enhanced features for serious users
   - **Pricing**: $10.00 USD
   - **Billing period**: Monthly
   - **Recurring**: Yes
4. Click "Save product"
5. **Copy the Price ID** (starts with `price_...`)
6. Save it as `EXPO_PUBLIC_STRIPE_GOLD_MONTHLY_PRICE_ID`

### 1.2 Diamond Plan - Monthly

1. Create a new product:
   - **Name**: Diamond Plan (Monthly)
   - **Description**: Premium features with annual savings
   - **Pricing**: $15.00 USD
   - **Billing period**: Monthly
   - **Recurring**: Yes
2. **Copy the Price ID**
3. Save it as `EXPO_PUBLIC_STRIPE_DIAMOND_MONTHLY_PRICE_ID`

### 1.3 Diamond Plan - Yearly (First Year)

1. Add a new price to the Diamond Plan product:
   - **Pricing**: $79.00 USD
   - **Billing period**: Yearly
   - **Recurring**: Yes
2. **Copy the Price ID**
3. Save it as `EXPO_PUBLIC_STRIPE_DIAMOND_YEARLY_FIRST_PRICE_ID`

### 1.4 Diamond Plan - Yearly (Renewal)

1. Add another price to the Diamond Plan product:
   - **Pricing**: $89.00 USD
   - **Billing period**: Yearly
   - **Recurring**: Yes
2. **Copy the Price ID**
3. Save it as `EXPO_PUBLIC_STRIPE_DIAMOND_YEARLY_RENEWAL_PRICE_ID`

### 1.5 Family Plan

1. Create a new product:
   - **Name**: Family Plan
   - **Description**: Diamond features for 2 accounts
   - **Pricing**: $20.00 USD
   - **Billing period**: Monthly
   - **Recurring**: Yes
2. **Copy the Price ID**
3. Save it as `EXPO_PUBLIC_STRIPE_FAMILY_MONTHLY_PRICE_ID`

## Step 2: Configure Stripe API Keys

### 2.1 Get Your API Keys

1. Go to Stripe Dashboard → Developers → API keys
2. Copy your **Publishable key** (starts with `pk_...`)
3. Copy your **Secret key** (starts with `sk_...`)

### 2.2 Create Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter webhook URL:
   ```
   https://your-supabase-project.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. **Copy the Signing secret** (starts with `whsec_...`)
7. Save it as `STRIPE_WEBHOOK_SECRET`

## Step 3: Update Environment Variables

Update your `.env` file with all the Stripe keys:

```env
# Stripe API Keys
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
EXPO_PUBLIC_STRIPE_GOLD_MONTHLY_PRICE_ID=price_...
EXPO_PUBLIC_STRIPE_DIAMOND_MONTHLY_PRICE_ID=price_...
EXPO_PUBLIC_STRIPE_DIAMOND_YEARLY_FIRST_PRICE_ID=price_...
EXPO_PUBLIC_STRIPE_DIAMOND_YEARLY_RENEWAL_PRICE_ID=price_...
EXPO_PUBLIC_STRIPE_FAMILY_MONTHLY_PRICE_ID=price_...
```

## Step 4: Deploy Supabase Edge Function

The webhook handler is already implemented. Deploy it:

```bash
# Deploy the webhook function
npx supabase functions deploy stripe-webhook
```

## Step 5: Test the Integration

### 5.1 Test Checkout Flow

1. Run your app
2. Navigate to the Subscription page
3. Click on any paid plan
4. Use Stripe test card: `4242 4242 4242 4242`
5. Use any future expiry date and any CVC
6. Complete checkout

### 5.2 Verify Webhook Events

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Check "Recent events" to see webhook calls
4. Verify events are returning `200 OK`

### 5.3 Test Subscription Management

1. After successful checkout, navigate to "My Subscription" tab
2. Verify subscription details are displayed correctly
3. Test cancellation flow
4. Test plan upgrades/downgrades

## Step 6: Test Diamond Plan Price Increase

The system automatically switches Diamond yearly subscribers from first-year pricing ($79) to renewal pricing ($89) after their first year.

To test this:

1. Create a Diamond yearly subscription with first-year pricing
2. In Stripe Dashboard, find the subscription
3. Manually trigger a renewal by updating the current period end to the past
4. Verify webhook handles the renewal and updates price to $89

## Step 7: Test Family Plan

### 7.1 Create Family Subscription

1. Subscribe to Family Plan
2. Go to Family Management (if implemented)
3. Add a family member by email
4. Verify they receive Diamond access

### 7.2 Test Family Member Limits

1. Try adding more than 2 members
2. Verify error: "Family plan limit reached"

## API Endpoints Reference

All API endpoints are implemented as API routes:

- `POST /api/create-checkout-session` - Create Stripe checkout session
- `GET /api/get-subscription` - Get user's current subscription
- `POST /api/cancel-subscription` - Cancel subscription
- `POST /api/update-subscription` - Upgrade/downgrade plan
- `POST /api/manage-family` - Add/remove family members

## Database Schema

The system uses three main tables:

- `subscriptions` - Stores subscription data
- `family_members` - Manages family plan members
- `subscription_events` - Audit trail of all subscription events

All tables have Row Level Security enabled.

## Troubleshooting

### Webhook not receiving events

1. Verify webhook URL is correct
2. Check webhook signing secret matches `.env`
3. Look at Stripe Dashboard → Webhooks → Recent events for errors

### Checkout session fails

1. Verify all price IDs are correct
2. Check Stripe API keys are for the correct mode (test/live)
3. Look at browser console for errors

### Subscription not showing in app

1. Check Supabase database for subscription record
2. Verify webhook successfully processed
3. Check `subscription_events` table for audit trail

### Diamond renewal price not updating

1. Verify both yearly price IDs are correct
2. Check `invoice.payment_succeeded` webhook is enabled
3. Look at subscription_events table for renewal events

## Going Live

Before going live:

1. Switch to **Live Mode** in Stripe Dashboard
2. Create the same products with live price IDs
3. Update `.env` with live Stripe keys
4. Update webhook URL to production URL
5. Test thoroughly with real payment methods
6. Enable Stripe's email receipts
7. Set up Stripe billing portal (optional)

## Security Best Practices

1. Never commit `.env` file to version control
2. Use environment-specific keys (test vs live)
3. Regularly rotate webhook secrets
4. Monitor Stripe Dashboard for unusual activity
5. Enable Stripe Radar for fraud detection
6. Set up Stripe email notifications for failed payments

## Support

For issues:
- Check Stripe Dashboard logs
- Review Supabase function logs
- Check `subscription_events` table
- Contact Stripe support for payment issues

## Cost Breakdown

With this setup, you pay Stripe:
- 2.9% + $0.30 per successful charge
- No monthly fees
- No setup fees
- No hidden costs

## Feature Access Control

Use the subscription context to gate features:

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function MyComponent() {
  const { subscriptionTier, isPremiumFeature } = useSubscription();

  const hasAccess = !isPremiumFeature('unlimited_scans');

  if (!hasAccess) {
    return <UpgradePrompt />;
  }

  return <PremiumContent />;
}
```

## Next Steps

1. Customize plan features in `services/StripeConfig.ts`
2. Add more payment methods (Apple Pay, Google Pay)
3. Implement promo codes
4. Add usage analytics
5. Set up revenue reporting
6. Create customer success workflows

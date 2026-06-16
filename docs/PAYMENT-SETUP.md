# Payment Integration Setup

This document explains how to set up the Stripe payment integration for user registration.

## Environment Variables

### Backend (.env)

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Get from Stripe Dashboard
STRIPE_PUBLIC_KEY=pk_test_... # Get from Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_... # Generated after setting up webhook

# Frontend URL (for checkout redirects)
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=mysql2://user:password@localhost:3306/database

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=7d
```

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:3000
VITE_STRIPE_PUBLIC_KEY=pk_test_... # Same as backend
```

## Database Migration

Run the following migration to add subscription and payment tracking tables:

```bash
npm run db:migrate
```

This creates three new tables:
- `subscriptions` - Tracks active subscriptions
- `payments` - Records all payment transactions
- `checkout_sessions` - Stores checkout session data

## Stripe Setup Steps

### 1. Create a Stripe Account

Visit [https://stripe.com](https://stripe.com) and create an account.

### 2. Get API Keys

1. Go to Dashboard → Developers → API Keys
2. Copy your **Secret Key** (starts with `sk_test_`)
3. Copy your **Publishable Key** (starts with `pk_test_`)
4. Add both to your `.env` files

### 3. Create Webhook

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Set URL to: `https://yourdomain.com/api/payment/webhook` (for production)
4. For local development, use ngrok: `ngrok http 3000`
5. Select these events:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `charge.refunded`
6. Copy the **Signing Secret** (starts with `whsec_`)
7. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

### 4. Set Product Prices

In your Stripe Dashboard, create the following products with prices:

- **Free Plan**: No price needed
- **Pro Plan**: $9.99/month
- **Team Plan**: $29.99/month

The product IDs will be stored automatically when users complete checkout.

## Registration Flow

### 1. Free Plan Registration

```
User → Select "Free" Plan → Create Account → Dashboard
```

### 2. Paid Plan Registration

```
User → Select "Pro" or "Team" → Payment Page → Stripe Checkout → 
Webhook Verification → Create Account → Dashboard
```

## API Endpoints

### Create Checkout Session

**POST** `/api/payment/create-checkout`

```json
{
  "email": "user@example.com",
  "plan": "pro"
}
```

Response:
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

### Verify Checkout

**POST** `/api/payment/verify-checkout`

```json
{
  "sessionId": "cs_..."
}
```

Response:
```json
{
  "userId": 123,
  "plan": "pro"
}
```

### Get Subscription

**GET** `/api/payment/subscription`

Requires authentication header.

Response:
```json
{
  "id": 1,
  "user_id": 123,
  "plan": "pro",
  "stripe_customer_id": "cus_...",
  "stripe_subscription_id": "sub_...",
  "status": "active",
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2024-02-01T00:00:00Z"
}
```

### Webhook

**POST** `/api/payment/webhook`

Handled by Stripe automatically. Listens for:
- Subscription updates
- Payment failures/successes
- Refunds

## Testing

### 1. Test with Stripe Test Cards

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Auth Required**: `4000 2500 0000 3155`

Any future expiration and any 3-digit CVC.

### 2. Local Testing with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your backend
npm run dev

# In another terminal, expose your local server
ngrok http 3000

# Update FRONTEND_URL in .env to ngrok URL
```

### 3. Verify Webhooks

In Stripe Dashboard → Developers → Webhooks, you can see:
- Recent deliveries
- Retry history
- Payload details

## Troubleshooting

### Webhook not receiving events

- Verify webhook URL is publicly accessible
- Check `STRIPE_WEBHOOK_SECRET` matches dashboard
- Review webhook delivery logs in Stripe Dashboard

### Checkout fails

- Verify `STRIPE_PUBLIC_KEY` and `STRIPE_SECRET_KEY` are correct
- Check `FRONTEND_URL` matches your domain
- Review console logs for error details

### Payment recorded but user not created

- Check database connection
- Verify webhook secret is configured
- Review server logs for webhook errors

## Security Notes

- Never commit `.env` files with real keys
- Use test keys for development
- Webhook secret must be protected
- PCI compliance: Don't handle raw card data
- Use Stripe Elements/Checkout for security

## Next Steps

After setup, users can:

1. Visit `/register`
2. Choose a plan
3. For paid plans, complete Stripe checkout
4. Create account with email and password
5. Onboard and start using the platform

## Support

For Stripe API issues, see: https://stripe.com/docs
For webhook debugging: https://stripe.com/docs/webhooks

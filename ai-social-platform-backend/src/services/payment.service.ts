import Stripe from 'stripe';
import { pool } from '../db/connection.js';
import { PLANS, type Plan } from '../config/plans.js';
import { AuthService } from './auth.service.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-04-10',
});

const PLAN_PRICES: Record<Plan, number> = {
  free: 0,
  pro: 999,
  team: 2999,
};

export class PaymentService {
  /**
   * Resolve user id for billing — metadata.userId first, else subscriptions.stripe_customer_id.
   * Never look up users by email.
   */
  static async resolveUserIdFromStripe(
    customerId: string,
    metadataUserId?: number
  ): Promise<number | null> {
    if (metadataUserId && Number.isFinite(metadataUserId)) {
      return metadataUserId;
    }
    const result = await pool.query(
      'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1 LIMIT 1',
      [customerId]
    );
    const userId = (result.rows[0] as { user_id?: number } | undefined)?.user_id;
    return userId ?? null;
  }

  /** UPDATE users SET plan = ? WHERE id = ? — id from Stripe metadata / customer_id lookup only. */
  static async updateUserPlan(userId: number, plan: Plan): Promise<void> {
    if (!PLANS.includes(plan)) throw new Error('Invalid plan');
    await pool.query('UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2', [plan, userId]);
  }

  static async getStripeCustomerId(userId: number): Promise<string | null> {
    const result = await pool.query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
      [userId]
    );
    return (result.rows[0] as { stripe_customer_id?: string } | undefined)?.stripe_customer_id ?? null;
  }

  static async createCheckoutSession(
    email: string,
    plan: Plan,
    userId?: number
  ): Promise<{ sessionId: string; url: string }> {
    if (plan === 'free') {
      return { sessionId: 'free', url: '' };
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured');
    }

    const existingCustomerId = userId ? await this.getStripeCustomerId(userId) : null;

    const session = await stripe.checkout.sessions.create({
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: email }),
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
              description: `AI Social Platform - ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
            },
            unit_amount: PLAN_PRICES[plan],
            recurring: { interval: 'month', interval_count: 1 },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?checkout=cancel`,
      metadata: {
        plan,
        ...(userId && { userId: userId.toString() }),
      },
    });

    await pool.query(
      `INSERT INTO checkout_sessions (id, user_id, plan, email, stripe_session_id, amount, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        session.id,
        userId ?? null,
        plan,
        email,
        session.id,
        PLAN_PRICES[plan],
        'open',
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      ]
    );

    return { sessionId: session.id, url: session.url || '' };
  }

  static async handleCheckoutComplete(sessionId: string): Promise<{ userId: number; plan: Plan }> {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    const plan = (session.metadata?.plan as Plan) || 'pro';
    if (!PLANS.includes(plan)) throw new Error('Invalid plan in session');

    const customerId = session.customer as string;
    if (!customerId) throw new Error('Missing Stripe customer');

    const metadataUserId = session.metadata?.userId
      ? parseInt(session.metadata.userId, 10)
      : undefined;
    const userId = await this.resolveUserIdFromStripe(customerId, metadataUserId);

    if (!userId) {
      throw new Error('Could not resolve user from Stripe customer_id or session metadata');
    }

    await this.applyPlanFromStripe(userId, plan, customerId, session.subscription as string | null);

    await pool.query(
      'UPDATE checkout_sessions SET status = $1, completed_at = $2 WHERE stripe_session_id = $3',
      ['completed', new Date(), sessionId]
    );

    return { userId, plan };
  }

  static async applyPlanFromStripe(
    userId: number,
    plan: Plan,
    customerId: string,
    subscriptionId: string | null
  ): Promise<void> {
    await this.updateUserPlan(userId, plan);

    let subscription: Stripe.Subscription | null = null;
    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } else {
      const list = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
      subscription = list.data[0] ?? null;
    }

    if (subscription) {
      await pool.query(
        `INSERT INTO subscriptions (user_id, plan, stripe_customer_id, stripe_subscription_id, stripe_product_id, stripe_price_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (user_id) DO UPDATE SET
         plan = EXCLUDED.plan,
         stripe_customer_id = EXCLUDED.stripe_customer_id,
         stripe_subscription_id = EXCLUDED.stripe_subscription_id,
         status = EXCLUDED.status,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          plan,
          customerId,
          subscription.id,
          subscription.items.data[0]?.plan.product,
          subscription.items.data[0]?.price.id,
          subscription.status,
          new Date(subscription.current_period_start * 1000),
          new Date(subscription.current_period_end * 1000),
        ]
      );
    }
  }

  /** Subscription cancelled — resolve user via customer_id, then SET plan = 'free' WHERE id = ? */
  static async downgradeByCustomerId(customerId: string): Promise<void> {
    const userId = await this.resolveUserIdFromStripe(customerId);
    if (!userId) return;

    await this.updateUserPlan(userId, 'free');
    await pool.query(
      `UPDATE subscriptions SET plan = 'free', status = 'canceled', updated_at = CURRENT_TIMESTAMP
       WHERE stripe_customer_id = $1`,
      [customerId]
    );
  }

  static async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = session.metadata?.plan as Plan | undefined;
        const customerId = session.customer as string;
        if (!plan || !PLANS.includes(plan) || !customerId) break;

        const metadataUserId = session.metadata?.userId
          ? parseInt(session.metadata.userId, 10)
          : undefined;
        const resolvedUserId = await this.resolveUserIdFromStripe(customerId, metadataUserId);

        if (resolvedUserId) {
          await this.applyPlanFromStripe(
            resolvedUserId,
            plan,
            customerId,
            session.subscription as string | null
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.downgradeByCustomerId(subscription.customer as string);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await this.downgradeByCustomerId(customerId);
          break;
        }

        await pool.query(
          `UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP
           WHERE stripe_customer_id = $2`,
          [subscription.status, customerId]
        );
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await pool.query(
            'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_invoice_id = $2',
            ['succeeded', invoice.id]
          );
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await pool.query(
            'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_invoice_id = $2',
            ['failed', invoice.id]
          );
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await pool.query(
          'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_payment_id = $2',
          ['canceled', charge.id]
        );
        break;
      }
    }
  }

  static async getSubscription(userId: number) {
    const result = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  static async verifyCheckoutSession(sessionId: string) {
    const result = await pool.query('SELECT * FROM checkout_sessions WHERE stripe_session_id = $1', [
      sessionId,
    ]);
    return result.rows[0] || null;
  }

  static verifyWebhookSignature(body: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }

  static async issueRefreshedToken(userId: number): Promise<string | null> {
    const user = await AuthService.getUserById(userId);
    if (!user) return null;
    return AuthService.generateToken(user.id, user.email, user.plan, user.role);
  }
}

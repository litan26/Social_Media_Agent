import { useEffect, useState } from 'react';
import { api } from '../../services/api';

type Plan = 'free' | 'pro' | 'team';

interface StripeCheckoutProps {
  email: string;
  plan: Plan;
  onSuccess: (userId: number) => void;
}

export function StripeCheckout({ email, plan }: StripeCheckoutProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createCheckout = async () => {
      try {
        setLoading(true);
        const { data } = await api.post('/payment/create-checkout', { email, plan });

        if (data.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to create checkout');
        setLoading(false);
      }
    };

    if (email && plan !== 'free') {
      createCheckout();
    }
  }, [email, plan]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Complete payment</h1>
      <p className="mt-2 text-slate-400">
        You will be redirected to Stripe's secure checkout page.
      </p>

      {error && <div className="mt-4 rounded-lg bg-red-500/20 p-3 text-sm text-red-200">{error}</div>}

      {loading && (
        <div className="mt-8 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-20 rounded bg-slate-700"></div>
            <div className="h-8 w-32 rounded bg-slate-700"></div>
            <div className="h-4 w-full rounded bg-slate-700"></div>
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">Preparing checkout...</p>
        </div>
      )}

      {!loading && !error && (
        <div className="mt-8 text-center text-slate-400">
          <p>You will be redirected to Stripe's secure payment page momentarily.</p>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-slate-500">
        Your payment information is processed securely by Stripe. We never store your card details.
      </p>
    </div>
  );
}

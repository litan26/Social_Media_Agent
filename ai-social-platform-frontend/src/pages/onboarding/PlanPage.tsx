import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { PageBackground } from '../../components/ui/PageBackground';
import { Logo } from '../../components/ui/Logo';

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    features: ['2 connected accounts', '10 AI generations / day', 'Basic analytics'],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$29/mo',
    features: ['10 accounts', '100 AI generations / day', 'Scheduling + insights'],
    popular: true,
  },
  {
    id: 'team' as const,
    name: 'Team',
    price: '$99/mo',
    features: ['50 accounts', '500 AI generations / day', 'Priority support'],
  },
];

const STEPS = ['Plan', 'Profile', 'Connect'];

export function PlanPage() {
  const navigate = useNavigate();
  const { user, setToken, fetchMe } = useAuthStore();
  const toast = useToastStore((s) => s.show);
  const [selected, setSelected] = useState<'free' | 'pro' | 'team'>('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!useAuthStore.getState().user) {
          await fetchMe();
        }
        const plan = useAuthStore.getState().user?.plan;
        if (plan) setSelected(plan);
      } catch {
        /* token may be invalid — ProtectedRoute will send to login */
      } finally {
        setReady(true);
      }
    };
    load();
  }, [fetchMe]);

  const handleContinue = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.put('/api/auth/plan', { plan: selected });
      if (data.token) {
        setToken(data.token);
      }
      await fetchMe();
      toast('Plan saved', 'success');
      navigate('/onboarding/profile', { replace: true });
    } catch (err) {
      const currentPlan = useAuthStore.getState().user?.plan ?? user?.plan;
      if (currentPlan === selected) {
        navigate('/onboarding/profile', { replace: true });
        return;
      }
      if (!axios.isAxiosError(err) || !err.response) {
        setError('Cannot reach the server. Start the backend (npm run dev) and try again.');
        toast('Backend not reachable', 'error');
      } else if (err.response.status === 401) {
        setError('Session expired. Please sign in again.');
        navigate('/login', { replace: true });
      } else {
        const msg =
          (err.response.data as { error?: string })?.error || 'Failed to save plan';
        setError(msg);
        toast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-12">
      <PageBackground />
      <div className="relative mx-auto max-w-4xl">
        <Logo to={false} size="sm" />

        <div className="mt-10 flex items-center gap-3">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <span className={`onboarding-step ${i === 0 ? 'onboarding-step-active' : ''}`}>
                <span
                  className={`onboarding-step-dot ${i === 0 ? 'onboarding-step-dot-active' : ''}`}
                />
                {step}
              </span>
              {i < STEPS.length - 1 && (
                <span className="hidden h-px w-8 bg-white/10 sm:block" />
              )}
            </div>
          ))}
        </div>

        <h1 className="mt-8 font-display text-3xl font-bold text-white md:text-4xl">
          Choose your plan
        </h1>
        <p className="mt-2 text-slate-400">You can change this anytime in Settings.</p>

        <div className="stagger-children mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan.id)}
              className={`feature-card w-full text-left ${
                selected === plan.id
                  ? 'border-violet-500/50 ring-2 ring-violet-500 ring-offset-2 ring-offset-[#050508]'
                  : ''
              }`}
            >
              {plan.popular && <span className="badge-violet mb-3">Most popular</span>}
              <p className="font-display text-xl font-bold text-white">{plan.name}</p>
              <p className="mt-1 text-2xl text-violet-300">{plan.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-violet-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {selected === plan.id && (
                <p className="mt-4 text-xs font-medium text-violet-300">Selected</p>
              )}
            </button>
          ))}
        </div>

        {error && <p className="alert-error mt-6">{error}</p>}

        <button
          type="button"
          onClick={handleContinue}
          disabled={loading}
          className="btn-primary mt-8"
        >
          {loading ? 'Saving...' : 'Continue to profile'}
        </button>
      </div>
    </div>
  );
}

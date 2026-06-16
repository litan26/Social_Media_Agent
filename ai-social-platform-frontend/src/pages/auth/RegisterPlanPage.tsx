import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { PageBackground } from '../../components/ui/PageBackground';
import { MarketingNav } from '../../components/ui/MarketingNav';
import {
  clearRegistrationDraft,
  getRegistrationDraft,
} from '../../lib/registrationDraft';

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

export function RegisterPlanPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const toast = useToastStore((s) => s.show);
  const [selected, setSelected] = useState<'free' | 'pro' | 'team'>('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getRegistrationDraft()) {
      navigate('/register', { replace: true });
    }
  }, [navigate]);

  const handleCreateAccount = async () => {
    const draft = getRegistrationDraft();
    if (!draft) {
      navigate('/register', { replace: true });
      return;
    }

    setLoading(true);
    setError('');
    try {
      await register({
        email: draft.email,
        phone: draft.phone,
        password: draft.password,
        plan: selected,
      });
      await fetchMe();
      clearRegistrationDraft();
      localStorage.setItem('onboarding_complete', '1');
      toast('Account created successfully', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (!axios.isAxiosError(err) || !err.response) {
        setError('Cannot reach the server. Make sure the backend is running on port 3000.');
      } else {
        setError((err.response.data as { error?: string })?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <MarketingNav />
      <PageBackground />
      <div className="relative mx-auto max-w-4xl px-4 py-12">
        <p className="text-sm text-slate-500">
          <Link to="/register" className="hover:text-violet-300">← Back to registration</Link>
        </p>

        <h1 className="mt-10 font-display text-3xl font-bold text-white md:text-4xl">
          Choose your plan
        </h1>
        <p className="mt-2 text-slate-400">
          Pick a plan to finish creating your account. You can change it later in Settings.
        </p>

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

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleCreateAccount}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating account...' : 'Create account & go to dashboard'}
          </button>
          <Link to="/register" className="text-sm text-slate-400 hover:text-violet-300">
            Back to registration
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConnectAccountsPanel } from '../../components/OAuth/ConnectAccountsPanel';

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, fetchMe } = useAuthStore();
  const [industry, setIndustry] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [plan, setPlan] = useState<'free' | 'pro' | 'team'>('free');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setIndustry(user.industry || '');
      setBusinessType(user.business_type || '');
      setPlan(user.plan ?? 'free');
    } else {
      fetchMe();
    }
  }, [user, fetchMe]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (searchParams.get('checkout') !== 'success' || !sessionId) return;

    api
      .post<{ token?: string }>('/api/payment/verify-checkout', { sessionId })
      .then(async ({ data }) => {
        if (data.token) localStorage.setItem('token', data.token);
        await fetchMe();
        setMessage('Plan upgraded successfully');
        setSearchParams({});
      })
      .catch(() => setMessage('Could not verify checkout — contact support'));
  }, [searchParams, setSearchParams, fetchMe]);

  const saveProfile = async () => {
    setSaving(true);
    setMessage('');
    await api.put('/api/auth/profile', { industry, business_type: businessType });
    await fetchMe();
    setSaving(false);
    setMessage('Profile saved');
  };

  const savePlan = async () => {
    setSaving(true);
    setMessage('');
    try {
      if (plan === 'free') {
        const { data } = await api.put('/api/auth/plan', { plan });
        if (data.token) localStorage.setItem('token', data.token);
        await fetchMe();
        setMessage('Plan updated to Free');
      } else {
        const { data } = await api.post<{ url: string }>('/api/payment/upgrade-plan', { plan });
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setMessage('Stripe checkout could not be started');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(err.response?.data?.error || 'Plan update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        badge="Account"
        title="Settings"
        subtitle="Profile, connected platforms, plan, and preferences"
      />

      {message && <p className="alert-success">{message}</p>}

      <div className="glass-card space-y-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Profile</h2>
          <p className="mt-1 text-sm text-slate-500">Used to personalize AI-generated content</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Industry</label>
          <input
            className="input-premium"
            placeholder="e.g. Technology, Healthcare, Retail"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Business type</label>
          <input
            className="input-premium"
            placeholder="e.g. SaaS startup, Agency, E-commerce"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
          />
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-secondary">
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </div>

      <div className="glass-card">
        <ConnectAccountsPanel />
      </div>

      <div className="glass-card space-y-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Plan</h2>
          <p className="mt-1 text-sm text-slate-500">Controls AI generation limits and features</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Current plan</label>
          <select
            className="select-premium"
            value={plan}
            onChange={(e) => setPlan(e.target.value as 'free' | 'pro' | 'team')}
          >
            <option value="free">Free — 5 AI generations / month, 2 accounts</option>
            <option value="pro">Pro — 100 AI generations / month, 10 accounts</option>
            <option value="team">Team — 500 AI generations / month, 50 accounts</option>
          </select>
        </div>
        <button onClick={savePlan} disabled={saving} className="btn-primary">
          {saving ? 'Updating...' : 'Update plan'}
        </button>
      </div>
    </div>
  );
}

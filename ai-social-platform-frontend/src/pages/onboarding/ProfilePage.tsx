import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { PageBackground } from '../../components/ui/PageBackground';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, fetchMe } = useAuthStore();
  const toast = useToastStore((s) => s.show);
  const [industry, setIndustry] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setIndustry(user.industry || '');
      setBusinessType(user.business_type || '');
      const prefs = user.voice_tone_preference as { tone?: string } | undefined;
      if (prefs?.tone) setTone(prefs.tone);
    } else {
      fetchMe().catch(() => {});
    }
  }, [user, fetchMe]);

  const handleContinue = async () => {
    if (!industry.trim() || !businessType.trim()) {
      setError('Please fill in industry and business type to continue.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.put('/api/auth/profile', {
        industry: industry.trim(),
        business_type: businessType.trim(),
        voice_tone_preference: { tone, style: tone },
      });
      await fetchMe();
      toast('Profile saved', 'success');
      navigate('/onboarding/connect', { replace: true });
    } catch (err) {
      if (!axios.isAxiosError(err) || !err.response) {
        setError('Cannot reach the server. Start the backend and try again.');
      } else {
        setError(
          (err.response.data as { error?: string })?.error || 'Failed to save profile'
        );
      }
      toast('Failed to save profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen px-4 py-12">
      <PageBackground />
      <div className="relative mx-auto max-w-lg">
        <p className="badge-violet mb-4">Step 2 of 3</p>
        <h1 className="font-display text-3xl font-bold text-white">Your brand profile</h1>
        <p className="mt-2 text-slate-400">Claude uses this to personalize every post variant.</p>

        <div className="glass-card mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">Industry</label>
            <input
              className="input-premium"
              placeholder="e.g. SaaS, Fashion, Finance"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">Business type</label>
            <input
              className="input-premium"
              placeholder="e.g. B2B startup, Creator, Agency"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">Voice & tone</label>
            <select
              className="select-premium"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual & friendly</option>
              <option value="bold">Bold & punchy</option>
              <option value="educational">Educational</option>
            </select>
          </div>
        </div>

        {error && <p className="alert-error mt-4">{error}</p>}

        <button
          type="button"
          onClick={handleContinue}
          disabled={loading}
          className="btn-primary mt-6 w-full"
        >
          {loading ? 'Saving...' : 'Continue to connect accounts'}
        </button>
      </div>
    </div>
  );
}

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useToastStore } from '../../store/toastStore';
import { ConnectAccountsPanel } from '../../components/OAuth/ConnectAccountsPanel';
import { PageBackground } from '../../components/ui/PageBackground';

export function ConnectPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const toast = useToastStore((s) => s.show);

  useEffect(() => {
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) {
      toast(`${connected} account connected`, 'success');
      setParams({});
    } else if (error) {
      toast(`Failed to connect ${error} — please try again`, 'error');
      setParams({});
    }
  }, [params, setParams, toast]);

  const finish = () => {
    localStorage.setItem('onboarding_complete', '1');
    navigate('/dashboard');
  };

  return (
    <div className="relative min-h-screen px-4 py-12">
      <PageBackground />
      <div className="relative mx-auto max-w-2xl">
        <p className="badge-violet mb-4">Step 3 of 3</p>
        <h1 className="font-display text-3xl font-bold text-white">Connect accounts</h1>
        <p className="mt-2 text-slate-400">
          Link your social profiles with live OAuth to publish and schedule posts.
        </p>

        <div className="mt-8">
          <ConnectAccountsPanel showHeader={false} />
        </div>

        <div className="mt-8 flex gap-3">
          <button type="button" onClick={finish} className="btn-primary flex-1">
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

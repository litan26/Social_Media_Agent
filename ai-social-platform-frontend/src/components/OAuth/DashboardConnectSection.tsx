import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { SOCIAL_PLATFORMS } from '../../constants/platforms';
import { useToastStore } from '../../store/toastStore';
import { IconGlobe } from '../ui/Icons';
import {
  fetchConnectedAccounts,
  startOAuthConnect,
  disconnectAccountById,
  type SocialAccount,
} from '../../services/accountsApi';
import { api } from '../../services/api';
import { OAuthSetupBanner, missingEnvSummary } from './OAuthSetupBanner';

type OAuthMode = 'live' | 'unconfigured';

interface PlatformStatus {
  platform: string;
  configured: boolean;
  mode: OAuthMode;
}

interface DashboardConnectSectionProps {
  onAccountsChange?: (count: number) => void;
  refreshToken?: number;
}

function displayHandle(account: SocialAccount): string {
  return account.username || account.account_handle || 'connected';
}

export function DashboardConnectSection({
  onAccountsChange,
  refreshToken = 0,
}: DashboardConnectSectionProps) {
  const toast = useToastStore((s) => s.show);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [platformStatus, setPlatformStatus] = useState<Record<string, PlatformStatus>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsData, platformsRes] = await Promise.all([
        fetchConnectedAccounts(),
        api.get<PlatformStatus[]>('/api/oauth/platforms'),
      ]);
      setAccounts(accountsData);
      onAccountsChange?.(accountsData.length);
      const map: Record<string, PlatformStatus> = {};
      platformsRes.data.forEach((p) => {
        map[p.platform] = p;
      });
      setPlatformStatus(map);
      setError('');
    } catch {
      toast('Could not load your connected accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [onAccountsChange, toast]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const connectAccount = async (platformId: string) => {
    const platform = SOCIAL_PLATFORMS.find((p) => p.id === platformId);
    if (!platform) return;

    setConnecting(platformId);
    setError('');

    try {
      const redirectUrl = await startOAuthConnect(platformId, '/dashboard');
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      setError('Live OAuth is not available for this platform.');
    } catch (err) {
      if (!axios.isAxiosError(err) || !err.response) {
        setError('Backend not reachable. Run: npm run dev in ai-social-platform-backend');
      } else if (err.response.status === 401) {
        toast('Session expired — please sign in again', 'error');
      } else {
        setError((err.response.data as { error?: string })?.error || 'Could not connect account');
      }
    } finally {
      setConnecting(null);
    }
  };

  const disconnect = async (accountId: number, label: string) => {
    try {
      await disconnectAccountById(accountId);
      toast(`${label} disconnected`, 'success');
      await load();
    } catch {
      toast('Failed to disconnect', 'error');
    }
  };

  const livePlatforms = SOCIAL_PLATFORMS.filter(
    (p) => platformStatus[p.id]?.mode === 'live' && !accounts.find((a) => a.platform === p.id)
  );

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-violet-600/10 via-fuchsia-600/5 to-transparent px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="feature-card-icon !mb-0 !h-12 !w-12">
              <IconGlobe className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                Connect your accounts
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                One click per platform — authorize with live OAuth, then return to your dashboard.
              </p>
            </div>
          </div>
          {!loading && livePlatforms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {livePlatforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => connectAccount(p.id)}
                  disabled={connecting === p.id}
                  className="btn-primary !py-2 !text-xs"
                >
                  {connecting === p.id ? 'Opening...' : `+ ${p.label}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {!loading && <OAuthSetupBanner platformStatus={platformStatus} />}

        {error && (
          <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {accounts.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Connected
            </p>
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => {
                const label = SOCIAL_PLATFORMS.find((p) => p.id === a.platform)?.label ?? a.platform;
                return (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-200"
                  >
                    <span>{label}</span>
                    <span className="text-emerald-400/80">@{displayHandle(a)}</span>
                    {a.token_status && a.token_status !== 'active' && (
                      <span className="text-xs text-amber-300">({a.token_status})</span>
                    )}
                    <button
                      type="button"
                      onClick={() => disconnect(a.id, label)}
                      className="ml-1 text-emerald-300/60 hover:text-red-300"
                      title="Disconnect"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-shimmer h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SOCIAL_PLATFORMS.map((p) => {
              const linked = accounts.find((a) => a.platform === p.id);
              const mode = platformStatus[p.id]?.mode ?? 'unconfigured';
              const canConnect = mode === 'live' && !linked;

              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    linked
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : canConnect
                        ? 'border-violet-500/20 bg-violet-500/5 hover:border-violet-500/40'
                        : 'border-white/[0.06] bg-white/[0.02]'
                  }`}
                >
                  <p className="font-medium text-white">{p.label}</p>
                  {linked ? (
                    <p className="mt-1 truncate text-sm text-emerald-400">
                      @{displayHandle(linked)}
                    </p>
                  ) : canConnect ? (
                    <button
                      type="button"
                      onClick={() => connectAccount(p.id)}
                      disabled={connecting === p.id}
                      className="btn-primary mt-3 w-full !py-2 !text-xs"
                    >
                      {connecting === p.id ? 'Redirecting...' : 'Connect'}
                    </button>
                  ) : (
                    <p className="mt-2 text-xs text-amber-300/90">
                      Set {missingEnvSummary(p.id)} in .env
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

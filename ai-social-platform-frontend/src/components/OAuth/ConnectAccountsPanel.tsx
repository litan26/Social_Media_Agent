import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { SOCIAL_PLATFORMS } from '../../constants/platforms';
import { useToastStore } from '../../store/toastStore';
import {
  fetchConnectedAccounts,
  startOAuthConnect,
  disconnectAccountById,
  type SocialAccount,
} from '../../services/accountsApi';
import { OAuthSetupBanner, missingEnvSummary } from './OAuthSetupBanner';

export type { SocialAccount };

type OAuthMode = 'live' | 'unconfigured';

interface PlatformStatus {
  platform: string;
  configured: boolean;
  mode: OAuthMode;
}

interface ConnectAccountsPanelProps {
  showHeader?: boolean;
}

export function ConnectAccountsPanel({ showHeader = true }: ConnectAccountsPanelProps) {
  const location = useLocation();
  const toast = useToastStore((s) => s.show);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [platformStatus, setPlatformStatus] = useState<Record<string, PlatformStatus>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPlatform, setPendingPlatform] = useState<(typeof SOCIAL_PLATFORMS)[number] | null>(
    null
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsData, platformsRes] = await Promise.all([
        fetchConnectedAccounts(),
        api.get<PlatformStatus[]>('/api/oauth/platforms'),
      ]);
      setAccounts(accountsData);
      const map: Record<string, PlatformStatus> = {};
      platformsRes.data.forEach((p) => {
        map[p.platform] = p;
      });
      setPlatformStatus(map);
    } catch {
      toast('Could not load connected accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const startConnect = (platform: (typeof SOCIAL_PLATFORMS)[number]) => {
    setPendingPlatform(platform);
    setError('');
  };

  const cancelConnect = () => {
    setPendingPlatform(null);
    setError('');
  };

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId]
    );
  };

  const confirmConnect = async () => {
    if (!pendingPlatform) return;

    const platform = pendingPlatform;
    setConnecting(platform.id);
    setError('');

    try {
      const redirectUrl = await startOAuthConnect(
        platform.id,
        location.pathname || '/settings'
      );

      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      setError('Live OAuth is not available for this platform.');
    } catch (err) {
      if (!axios.isAxiosError(err) || !err.response) {
        setError('Cannot reach the server. Is the backend running on port 3000?');
      } else if (err.response.status === 401) {
        toast('Please sign in again', 'error');
      } else {
        const msg = (err.response.data as { error?: string })?.error || 'Connection failed';
        setError(msg);
      }
    } finally {
      setConnecting(null);
    }
  };

  const connectSelectedPlatforms = async () => {
    if (selectedPlatforms.length === 0) return;
    setConnecting('bulk');
    setError('');

    const windows = selectedPlatforms.map(() => window.open('about:blank'));

    for (let index = 0; index < selectedPlatforms.length; index += 1) {
      const platformId = selectedPlatforms[index];
      const targetWindow = windows[index];
      try {
        const redirectUrl = await startOAuthConnect(platformId, location.pathname || '/settings');
        if (redirectUrl && targetWindow) {
          targetWindow.location.href = redirectUrl;
        } else if (targetWindow) {
          targetWindow.close();
        }
      } catch (err) {
        if (targetWindow) targetWindow.close();
        if (!axios.isAxiosError(err) || !err.response) {
          setError('Cannot reach the server. Is the backend running on port 3000?');
        } else if (err.response.status === 401) {
          toast('Please sign in again', 'error');
        } else {
          const msg = (err.response.data as { error?: string })?.error || 'Connection failed';
          setError(msg);
        }
      }
    }

    setSelectedPlatforms([]);
    setConnecting(null);
  };

  const disconnect = async (accountId: number, platform: string) => {
    setDisconnecting(accountId);
    try {
      await disconnectAccountById(accountId);
      toast(`${platform} disconnected`, 'success');
      await load();
    } catch {
      toast('Failed to disconnect account', 'error');
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div>
      {showHeader && (
        <div className="mb-5">
          <h2 className="font-display text-lg font-semibold text-white">Connect social accounts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Each user connects their own accounts via live OAuth. Add platform API keys to backend{' '}
            <code className="text-slate-400">.env</code> — one account per platform per user.
          </p>
        </div>
      )}

      {!loading && <OAuthSetupBanner platformStatus={platformStatus} />}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {selectedPlatforms.length > 0 && (
            <div className="mb-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
              <p className="text-sm font-semibold text-white">
                Selected platforms: {selectedPlatforms.length}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Review the platforms below and connect the ones you need. You can select multiple social media accounts and open live OAuth flows for each.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={connectSelectedPlatforms}
                  disabled={connecting === 'bulk'}
                  className="btn-primary !py-2 !text-sm"
                >
                  {connecting === 'bulk' ? 'Opening selected...' : 'Connect selected accounts'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlatforms([])}
                  className="btn-ghost !py-2 !text-sm"
                >
                  Clear selection
                </button>
              </div>
            </div>
          )}

          {SOCIAL_PLATFORMS.map((p) => {
            const linked = accounts.find((a) => a.platform === p.id);
            const status = platformStatus[p.id];
            const mode = status?.mode ?? 'unconfigured';
            const isPending = pendingPlatform?.id === p.id;
            const canConnect = mode === 'live' && !linked;

            return (
              <div
                key={p.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      {canConnect ? (
                        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={selectedPlatforms.includes(p.id)}
                            onChange={() => handlePlatformToggle(p.id)}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-violet-500"
                          />
                          <span>Select</span>
                        </label>
                      ) : (
                        <div className="h-5 w-5" />
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{p.label}</p>
                        <span
                          className={
                            mode === 'live'
                              ? 'badge border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                              : 'badge border-amber-500/30 bg-amber-500/10 text-amber-200'
                          }
                        >
                          {mode === 'live' ? 'Live OAuth' : 'API keys required'}
                        </span>
                      </div>
                    </div>
                    {linked ? (
                      <p className="mt-1 text-sm text-emerald-400">
                        Connected as @{linked.username || linked.account_handle}
                        {(linked.account_handle || linked.username || '').startsWith('demo_') && (
                          <span className="ml-2 text-amber-300">
                            (demo — disconnect and reconnect with live OAuth)
                          </span>
                        )}
                      </p>
                    ) : mode === 'unconfigured' ? (
                      <p className="mt-1 text-sm text-amber-300/90">
                        Admin: set {missingEnvSummary(p.id)} in backend{' '}
                        <code className="text-amber-200/80">.env</code>, then restart server
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">Not connected</p>
                    )}
                  </div>

                  {linked ? (
                    <button
                      type="button"
                      onClick={() => disconnect(linked.id, p.label)}
                      disabled={disconnecting === linked.id}
                      className="btn-ghost shrink-0 text-red-400 hover:text-red-300"
                    >
                      {disconnecting === linked.id ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  ) : canConnect ? (
                    <button
                      type="button"
                      onClick={() => startConnect(p)}
                      disabled={connecting === p.id || !!pendingPlatform}
                      className="btn-secondary shrink-0 !py-2 !text-sm"
                    >
                      Connect account
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="btn-ghost shrink-0 !py-2 !text-sm opacity-50"
                    >
                      Unavailable
                    </button>
                  )}
                </div>

                {isPending && (
                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    <p className="text-sm text-slate-400">
                      You will be redirected to {p.label} to sign in and authorize this app.
                    </p>
                    {error && <p className="alert-error mt-3">{error}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={confirmConnect}
                        disabled={connecting === p.id}
                        className="btn-primary !py-2 !text-sm"
                      >
                        {connecting === p.id ? 'Redirecting...' : `Continue to ${p.label}`}
                      </button>
                      <button
                        type="button"
                        onClick={cancelConnect}
                        className="btn-ghost !py-2 !text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

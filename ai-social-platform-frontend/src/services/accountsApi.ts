import { api } from './api';

export interface SocialAccount {
  id: number;
  platform: string;
  account_handle?: string;
  username?: string;
  platform_user_id?: string | null;
  avatar_url?: string | null;
  token_status?: 'active' | 'expiring' | 'expired';
  connected_at?: string;
  expires_at?: string | null;
}

export async function fetchConnectedAccounts(): Promise<SocialAccount[]> {
  const { data } = await api.get<{ accounts: SocialAccount[] } | SocialAccount[]>('/api/oauth/accounts');
  if (Array.isArray(data)) return data;
  return data.accounts ?? [];
}

export async function startOAuthConnect(
  platform: string,
  _returnTo = '/dashboard'
): Promise<string> {
  const { data } = await api.get<{ authUrl: string; redirectUrl?: string }>(
    `/api/oauth/${platform}/auth`,
    { params: { returnTo: _returnTo } }
  );
  return data.redirectUrl || data.authUrl || '';
}

export async function disconnectPlatform(platform: string): Promise<void> {
  await api.delete('/api/oauth/disconnect', { data: { platform } });
}

export async function disconnectAccountById(accountId: number): Promise<void> {
  await api.delete(`/api/oauth/accounts/${accountId}`);
}

import { SOCIAL_PLATFORMS } from '../../constants/platforms';

const ENV_KEYS: Record<string, string[]> = {
  twitter: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'],
  instagram: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'],
  linkedin: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
  facebook: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
  tiktok: ['TIKTOK_CLIENT_ID', 'TIKTOK_CLIENT_SECRET'],
  pinterest: ['PINTEREST_APP_ID', 'PINTEREST_APP_SECRET'],
  youtube: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
};

interface OAuthSetupBannerProps {
  platformStatus: Record<string, { configured: boolean; mode: string }>;
}

export function OAuthSetupBanner({ platformStatus }: OAuthSetupBannerProps) {
  const unconfiguredPlatforms = SOCIAL_PLATFORMS.filter(
    (p) => platformStatus[p.id]?.mode !== 'live'
  );

  // Only show the global setup banner when *no* platforms are configured.
  // If at least one provider is live (e.g. Twitter), hide the banner and let
  // per-platform UI indicate missing keys.
  if (unconfiguredPlatforms.length !== SOCIAL_PLATFORMS.length) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
      <p className="font-semibold text-amber-50">Platform setup required (one-time, server admin)</p>
      <p className="mt-2 text-amber-100/90 leading-relaxed">
        Connect buttons stay disabled until <strong>you</strong> add OAuth app credentials to{' '}
        <code className="rounded bg-black/20 px-1">ai-social-platform-backend/.env</code> and restart
        the backend. That is normal — those keys identify <em>your app</em> to Twitter, Instagram,
        etc., not individual users.
      </p>
      <p className="mt-2 text-amber-100/80">
        After keys are set, <strong>each user</strong> clicks Connect and signs in with their own
        social account. Tokens are stored per user in the database.
      </p>

      <div className="mt-4 space-y-3 rounded-xl border border-amber-500/20 bg-black/10 p-4 text-xs text-amber-200">
        {unconfiguredPlatforms.map((platform) => (
          <div key={platform.id}>
            <p className="font-semibold text-amber-100">{platform.label}</p>
            <p className="mt-1 text-amber-200/80">
              Set <code>{ENV_KEYS[platform.id]?.join(', ')}</code> in <code>.env</code>.
            </p>
            <p className="mt-1 text-amber-200/70 break-all">
              Callback: <code>http://localhost:3000/oauth/callback/{platform.id}</code>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function missingEnvSummary(platformId: string): string {
  const keys = ENV_KEYS[platformId] || [];
  return keys.join(', ');
}

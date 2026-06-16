import axios from 'axios';

export type Platform =
  | 'twitter'
  | 'instagram'
  | 'linkedin'
  | 'facebook'
  | 'tiktok'
  | 'pinterest'
  | 'youtube';

export interface OAuthTokens {
  handle: string;
  platformUserId?: string;
  avatarUrl?: string;
  scopes?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

function apiUrl(): string {
  return process.env.API_URL || process.env.CALLBACK_BASE || 'http://localhost:3000';
}

/** Guide format: {API_URL}/oauth/callback/{platform} */
export function oauthCallbackUri(platform: Platform): string {
  return `${apiUrl()}/oauth/callback/${platform}`;
}

function redirectUri(platform: Platform): string {
  return oauthCallbackUri(platform);
}

function defaultExpiry(days = 60): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function buildPlatformAuthUrl(
  platform: Platform,
  state: string,
  codeVerifier?: string,
  codeChallenge?: string
): string {
  switch (platform) {
    case 'twitter': {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.TWITTER_CLIENT_ID || '',
        redirect_uri: redirectUri(platform),
        scope: 'tweet.read tweet.write users.read offline.access',
        state,
        code_challenge: codeChallenge || '',
        code_challenge_method: 'S256',
      });
      return `https://twitter.com/i/oauth2/authorize?${params}`;
    }
    case 'linkedin': {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        redirect_uri: redirectUri(platform),
        state,
        scope: 'openid profile email w_member_social',
      });
      return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
    }
    case 'facebook': {
      const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID || '',
        redirect_uri: redirectUri(platform),
        state,
        scope: 'public_profile,email,pages_show_list,pages_manage_posts',
        response_type: 'code',
      });
      return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
    }
    case 'instagram': {
      const params = new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID || '',
        redirect_uri: redirectUri(platform),
        scope: 'user_profile,user_media',
        response_type: 'code',
        state,
      });
      return `https://api.instagram.com/oauth/authorize?${params}`;
    }
    case 'tiktok': {
      const params = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_ID || '',
        scope: 'user.info.basic,video.publish',
        response_type: 'code',
        redirect_uri: redirectUri(platform),
        state,
      });
      if (codeChallenge) {
        params.set('code_challenge', codeChallenge);
        params.set('code_challenge_method', 'S256');
      }
      return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
    }
    case 'pinterest': {
      const params = new URLSearchParams({
        client_id: process.env.PINTEREST_APP_ID || '',
        redirect_uri: redirectUri(platform),
        response_type: 'code',
        scope: 'boards:read,pins:read,user_accounts:read',
        state,
      });
      return `https://www.pinterest.com/oauth/?${params}`;
    }
    case 'youtube': {
      const params = new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID || '',
        redirect_uri: redirectUri(platform),
        response_type: 'code',
        scope:
          'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile',
        access_type: 'offline',
        prompt: 'consent',
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export async function exchangePlatformCode(
  platform: Platform,
  code: string,
  codeVerifier?: string
): Promise<OAuthTokens> {
  switch (platform) {
    case 'twitter':
      return exchangeTwitter(code, codeVerifier);
    case 'linkedin':
      return exchangeLinkedIn(code);
    case 'facebook':
      return exchangeFacebook(code);
    case 'instagram':
      return exchangeInstagram(code);
    case 'tiktok':
      return exchangeTikTok(code, codeVerifier);
    case 'pinterest':
      return exchangePinterest(code);
    case 'youtube':
      return exchangeYouTube(code);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function exchangeTwitter(code: string, codeVerifier?: string): Promise<OAuthTokens> {
  const tokenParams: Record<string, string> = {
    code,
    client_id: process.env.TWITTER_CLIENT_ID || '',
    client_secret: process.env.TWITTER_CLIENT_SECRET || '',
    redirect_uri: redirectUri('twitter'),
    grant_type: 'authorization_code',
  };
  if (codeVerifier) tokenParams.code_verifier = codeVerifier;

  const tokenRes = await axios.post(
    'https://api.twitter.com/2/oauth2/token',
    new URLSearchParams(tokenParams),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, refresh_token, expires_in } = tokenRes.data;
  const userRes = await axios.get('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  return {
    handle: userRes.data.data.username,
    platformUserId: userRes.data.data.id,
    scopes: tokenRes.data.scope,
    accessToken: access_token,
    refreshToken: refresh_token || '',
    expiresAt: new Date(Date.now() + (expires_in || 7200) * 1000),
  };
}

async function exchangeLinkedIn(code: string): Promise<OAuthTokens> {
  const tokenRes = await axios.post(
    'https://www.linkedin.com/oauth/v2/accessToken',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri('linkedin'),
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, expires_in, refresh_token } = tokenRes.data;
  const profile = await axios.get('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const handle =
    profile.data.preferred_username ||
    profile.data.name?.replace(/\s+/g, '_').toLowerCase() ||
    String(profile.data.sub);

  return {
    handle,
    accessToken: access_token,
    refreshToken: refresh_token || '',
    expiresAt: new Date(Date.now() + (expires_in || 5184000) * 1000),
  };
}

async function exchangeFacebook(code: string): Promise<OAuthTokens> {
  const tokenRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
    params: {
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: redirectUri('facebook'),
      code,
    },
  });

  let accessToken = tokenRes.data.access_token as string;
  let expiresIn = tokenRes.data.expires_in as number | undefined;

  try {
    const longLived = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: accessToken,
      },
    });
    accessToken = longLived.data.access_token;
    expiresIn = longLived.data.expires_in;
  } catch {
    // keep short-lived token
  }

  const profile = await axios.get('https://graph.facebook.com/me', {
    params: { fields: 'id,name', access_token: accessToken },
  });

  return {
    handle: String(profile.data.name || profile.data.id).replace(/\s+/g, '_').toLowerCase(),
    accessToken,
    refreshToken: '',
    expiresAt: expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : defaultExpiry(60),
  };
}

async function exchangeInstagram(code: string): Promise<OAuthTokens> {
  const shortRes = await axios.post(
    'https://api.instagram.com/oauth/access_token',
    new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID || '',
      client_secret: process.env.INSTAGRAM_APP_SECRET || '',
      grant_type: 'authorization_code',
      redirect_uri: redirectUri('instagram'),
      code,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const shortToken = shortRes.data.access_token as string;

  const longRes = await axios.get('https://graph.instagram.com/access_token', {
    params: {
      grant_type: 'ig_exchange_token',
      client_secret: process.env.INSTAGRAM_APP_SECRET,
      access_token: shortToken,
    },
  });

  const accessToken = longRes.data.access_token as string;
  const expiresIn = longRes.data.expires_in as number;

  const profile = await axios.get('https://graph.instagram.com/me', {
    params: { fields: 'id,username', access_token: accessToken },
  });

  return {
    handle: profile.data.username || String(profile.data.id),
    accessToken,
    refreshToken: '',
    expiresAt: new Date(Date.now() + (expiresIn || 5184000) * 1000),
  };
}

async function exchangeTikTok(code: string, codeVerifier?: string): Promise<OAuthTokens> {
  const body: Record<string, string> = {
    client_key: process.env.TIKTOK_CLIENT_ID || '',
    client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri('tiktok'),
  };
  if (codeVerifier) body.code_verifier = codeVerifier;

  const tokenRes = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', body, {
    headers: { 'Content-Type': 'application/json' },
  });

  const data = tokenRes.data.data || tokenRes.data;
  const accessToken = data.access_token as string;
  const refreshToken = data.refresh_token as string;
  const expiresIn = data.expires_in as number;

  const userRes = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
    params: { fields: 'open_id,display_name,username' },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const user = userRes.data.data?.user || userRes.data.user || {};
  const handle = user.username || user.display_name || user.open_id || 'tiktok_user';

  return {
    handle: String(handle).replace(/^@/, ''),
    accessToken,
    refreshToken: refreshToken || '',
    expiresAt: new Date(Date.now() + (expiresIn || 86400) * 1000),
  };
}

async function exchangePinterest(code: string): Promise<OAuthTokens> {
  const basic = Buffer.from(
    `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`
  ).toString('base64');

  const tokenRes = await axios.post(
    'https://api.pinterest.com/v5/oauth/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri('pinterest'),
    }),
    {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const { access_token, refresh_token, expires_in } = tokenRes.data;

  const profile = await axios.get('https://api.pinterest.com/v5/user_account', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  return {
    handle: profile.data.username || profile.data.id || 'pinterest_user',
    accessToken: access_token,
    refreshToken: refresh_token || '',
    expiresAt: new Date(Date.now() + (expires_in || 2592000) * 1000),
  };
}

async function exchangeYouTube(code: string): Promise<OAuthTokens> {
  const tokenRes = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID || '',
      client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
      redirect_uri: redirectUri('youtube'),
      grant_type: 'authorization_code',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, refresh_token, expires_in } = tokenRes.data;

  const profile = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  return {
    handle: profile.data.email?.split('@')[0] || profile.data.name || profile.data.id,
    accessToken: access_token,
    refreshToken: refresh_token || '',
    expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000),
  };
}

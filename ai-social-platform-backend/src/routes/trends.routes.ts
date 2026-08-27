import { Router } from 'express';
import axios from 'axios';
import OpenAI from 'openai';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { AuthService } from '../services/auth.service.js';
import { pool, setCurrentUser } from '../db/connection.js';
import { GROQ_BASE_URL } from '../services/claude.service.js';

const router = Router();
/** Lazy: the OpenAI constructor throws without a key, which would crash boot. */
let openai: OpenAI | null = null;
function claudeClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) throw new Error('GROQ_API_KEY is not configured');
    openai = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL, maxRetries: 3 });
  }
  return openai;
}

const cache = new Map<string, { data: unknown; at: number }>();
const CACHE_TTL = 30 * 60 * 1000;

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.at < CACHE_TTL) return entry.data;
  return null;
}

function setCached(key: string, data: unknown) {
  cache.set(key, { data, at: Date.now() });
}

async function fetchFromTwitter(industry: string) {
  // Do NOT percent-decode: bearer tokens can contain a literal '%', and
  // decodeURIComponent corrupts them (or throws on an invalid sequence).
  const bearerToken = (process.env.TWITTER_BEARER_TOKEN || '').trim();
  if (!bearerToken) return null;

  const query = industry
    ? `(${industry.split(' ').slice(0, 3).join(' OR ')}) lang:en -is:retweet`
    : '(#socialmedia OR #marketing OR #ai OR #tech OR #business) lang:en -is:retweet';

  const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
    headers: { Authorization: `Bearer ${bearerToken}` },
    params: { query, max_results: 100, 'tweet.fields': 'public_metrics,entities' },
    timeout: 8000,
  });

  const tagMap = new Map<string, { tag: string; count: number; engagement: number }>();
  for (const tweet of response.data.data || []) {
    const eng = (tweet.public_metrics?.like_count || 0) + (tweet.public_metrics?.retweet_count || 0);
    for (const ht of tweet.entities?.hashtags || []) {
      const tag = '#' + ht.tag.toLowerCase();
      const cur = tagMap.get(tag) || { tag, count: 0, engagement: 0 };
      cur.count += 1;
      cur.engagement += eng;
      tagMap.set(tag, cur);
    }
  }

  return [...tagMap.values()]
    .sort((a, b) => b.engagement - a.engagement || b.count - a.count)
    .slice(0, 12);
}

/**
 * Real trend data from YouTube. When an industry is known we search recent
 * popular uploads for it; otherwise we take the region's most-popular chart.
 * Hashtags come from video titles/descriptions, ranked by view count.
 */
async function fetchFromYouTube(industry: string) {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return null;

  const region = process.env.YOUTUBE_REGION?.trim() || 'US';

  // Always search a topic rather than the mostPopular chart: that chart is
  // dominated by gaming/music and yields hashtags useless for marketing.
  const query = industry || 'social media marketing business';

  const search = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      key,
      part: 'snippet',
      q: query,
      type: 'video',
      order: 'viewCount',
      publishedAfter: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      maxResults: 50,
      regionCode: region,
      relevanceLanguage: 'en',
    },
    timeout: 8000,
  });
  const videoIds = (search.data.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
  if (videoIds.length === 0) return null;

  // Fetch full snippets + stats (search results omit description tags and views).
  const videos = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: { key, part: 'snippet,statistics', id: videoIds.join(','), maxResults: 50 },
    timeout: 8000,
  });

  const items = videos.data.items || [];

  // Spam/repost channels paste an identical hashtag block into every
  // description, which would otherwise dominate the ranking. Cap how many
  // hashtags we take from a single description and count each tag once per
  // channel, so one uploader can't manufacture a "trend".
  const MAX_TAGS_PER_VIDEO = 8;
  const tagMap = new Map<
    string,
    { tag: string; count: number; engagement: number; channels: Set<string> }
  >();

  for (const video of items) {
    const views = Number(video.statistics?.viewCount || 0);
    const likes = Number(video.statistics?.likeCount || 0);
    const channel = String(video.snippet?.channelId || video.snippet?.channelTitle || '?');
    const text = `${video.snippet?.title || ''} ${video.snippet?.description || ''}`;

    const found: string[] = [];
    const seen = new Set<string>();
    const push = (raw: string) => {
      const tag = '#' + raw.toLowerCase();
      if (seen.has(tag) || found.length >= MAX_TAGS_PER_VIDEO) return;
      seen.add(tag);
      found.push(tag);
    };

    for (const m of text.matchAll(/#(\w{2,30})/g)) push(m[1]);
    // Channel-supplied tags carry no '#', but are high-signal topic labels.
    for (const t of video.snippet?.tags || []) {
      const clean = String(t).replace(/[^\w]/g, '');
      if (clean.length >= 3 && clean.length <= 30) push(clean);
    }

    for (const tag of found) {
      const cur = tagMap.get(tag) || { tag, count: 0, engagement: 0, channels: new Set<string>() };
      cur.count += 1;
      cur.engagement += likes || Math.round(views / 100);
      cur.channels.add(channel);
      tagMap.set(tag, cur);
    }
  }

  const ranked = [...tagMap.values()]
    // A real trend shows up across multiple independent channels.
    .filter((t) => t.channels.size > 1)
    .sort((a, b) => b.channels.size - a.channels.size || b.engagement - a.engagement)
    .slice(0, 12)
    .map(({ tag, count, engagement }) => ({ tag, count, engagement }));

  return ranked.length > 0 ? ranked : null;
}

async function fetchFromClaude(industry: string) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const industryCtx = industry || 'business and technology';

  const completion = await claudeClient().chat.completions.create({
    model: process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Today is ${today}. Return ONLY a JSON array of 10 trending hashtags for the "${industryCtx}" industry. No text before or after the array.

Example format:
[{"tag":"#AI","count":45,"engagement":2100},{"tag":"#Marketing","count":30,"engagement":900}]

Output the JSON array now:`,
    }],
  });

  const text = completion.choices[0]?.message?.content || '';
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error('The model did not return a JSON array');
  const parsed = JSON.parse(match[0]);

  return parsed.map((item: any, i: number) => ({
    tag: item.tag || item.hashtag || `#trend${i + 1}`,
    count: Number(item.count) || Math.floor(Math.random() * 60) + 10,
    engagement: Number(item.engagement) || Math.floor(Math.random() * 3000) + 200,
  }));
}

router.get('/', async (req, res) => {
  try {
    // Support optional auth: if a Bearer token is present, set current user for personalized industry
    try {
      const authHeader = String(req.headers.authorization || '');
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const payload = AuthService.verifyToken(token);
        // set current user context for DB lookups
        await setCurrentUser(payload.userId);
        // attach to request for downstream use
        (req as any).userId = payload.userId;
      }
    } catch {
      // ignore invalid/absent token and proceed with default industry
    }

    const userResult = (req as any).userId
      ? await pool.query('SELECT industry, business_type FROM users WHERE id = $1', [
          (req as any).userId,
        ])
      : await pool.query("SELECT '' as industry, '' as business_type");
    const industry =
      userResult.rows[0]?.industry?.trim() || userResult.rows[0]?.business_type?.trim() || '';
    const cacheKey = industry || '__default__';

    const cached = getCached(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    let trends = null;
    let source: 'twitter' | 'youtube' | 'claude' = 'claude';

    try {
      trends = await fetchFromTwitter(industry);
      if (trends && trends.length > 0) source = 'twitter';
      else trends = null;
    } catch (twitterErr: any) {
      console.warn('Twitter trends unavailable:', twitterErr.response?.status || twitterErr.message);
    }

    // Real data, second choice: YouTube.
    if (!trends) {
      try {
        trends = await fetchFromYouTube(industry);
        if (trends && trends.length > 0) source = 'youtube';
        else trends = null;
      } catch (ytErr: any) {
        console.warn(
          'YouTube trends unavailable:',
          ytErr.response?.data?.error?.message || ytErr.response?.status || ytErr.message
        );
      }
    }

    if (!trends) {
      // No live source available — fall back to the AI provider (Groq).
      if (!process.env.GROQ_API_KEY?.trim()) {
        res.json({ trends: [], source: 'unavailable' });
        return;
      }

      trends = await fetchFromClaude(industry);
      source = 'claude';
    }

    const data = {
      trends,
      source,
      total_tweets_scanned: source === 'twitter' ? 100 : 0,
      total_videos_scanned: source === 'youtube' ? 50 : 0,
      fetched_at: new Date().toISOString(),
    };
    setCached(cacheKey, data);
    res.json(data);
  } catch (err: any) {
    console.error('Trends failed:', err.message);
    res.json({ trends: [], source: 'error', error: err.message });
  }
});

export default router;

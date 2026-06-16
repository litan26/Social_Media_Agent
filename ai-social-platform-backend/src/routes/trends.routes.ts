import { Router } from 'express';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { AuthService } from '../services/auth.service.js';
import { pool, setCurrentUser } from '../db/connection.js';

const router = Router();
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetriesPerRequest: 3 });

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
  const raw = process.env.TWITTER_BEARER_TOKEN || '';
  const bearerToken = raw.includes('%') ? decodeURIComponent(raw) : raw;
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

async function fetchFromClaude(industry: string) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const industryCtx = industry || 'business and technology';

  const msg = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Today is ${today}. Return ONLY a JSON array of 10 trending hashtags for the "${industryCtx}" industry. No text before or after the array.

Example format:
[{"tag":"#AI","count":45,"engagement":2100},{"tag":"#Marketing","count":30,"engagement":900}]

Output the JSON array now:`,
    }],
  });

  const text = msg.content.find((b) => b.type === 'text')?.text || '';
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error('Claude did not return JSON array');
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
      ? await pool.query('SELECT industry FROM users WHERE id = $1', [(req as any).userId])
      : await pool.query("SELECT '' as industry");
    const industry = userResult.rows[0]?.industry || '';
    const cacheKey = industry || '__default__';

    const cached = getCached(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    let trends = null;
    let source: 'twitter' | 'claude' = 'claude';

    try {
      trends = await fetchFromTwitter(industry);
      if (trends && trends.length > 0) source = 'twitter';
      else trends = null;
    } catch (twitterErr: any) {
      console.warn('Twitter trends unavailable:', twitterErr.response?.status || twitterErr.message);
    }

    if (!trends) {
      // If neither Twitter nor Anthropic configured, return an 'unavailable' hint
      const hasTwitter = Boolean(process.env.TWITTER_BEARER_TOKEN);
      const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);
      if (!hasTwitter && !hasClaude) {
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

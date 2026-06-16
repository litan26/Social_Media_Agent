import { pool, setCurrentUser } from '../db/connection.js';
import { formatPlatformConstraints } from '../config/platformLimits.js';

export interface RecentPost {
  content: string;
  platform: string | null;
  created_at: Date;
}

export interface PromptContext {
  systemPrompt: string;
  userMessage: string;
  suggestedHashtags: string[];
}

export async function assemblePromptContext(
  userId: number,
  topic: string,
  platforms: string[],
  options?: { tone?: string; keywords?: string[] }
): Promise<PromptContext> {
  await setCurrentUser(userId);

  const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];

  const recentPostsResult = await pool.query(
    `SELECT content, platform, created_at
     FROM posts
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  );
  const recentPosts = recentPostsResult.rows as RecentPost[];

  const preferencesResult = await pool.query(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId]
  );
  const preferences = preferencesResult.rows[0] || {};

  const accountsResult = await pool.query(
    'SELECT platform, account_handle, followers_count FROM social_accounts WHERE user_id = $1',
    [userId]
  );
  const accounts = accountsResult.rows;

  const voice = user?.voice_tone_preference
    ? JSON.stringify(user.voice_tone_preference)
    : 'Professional and on-brand';

  const recentBlock =
    recentPosts.length > 0
      ? recentPosts
          .map(
            (p) =>
              `- [${p.platform || 'unknown'} · ${new Date(p.created_at).toISOString().slice(0, 10)}] "${p.content.slice(0, 200)}${p.content.length > 200 ? '…' : ''}"`
          )
          .join('\n')
      : '- No prior posts yet';

  const aiInsights =
    typeof preferences.ai_insights === 'string'
      ? JSON.parse(preferences.ai_insights || '{}')
      : preferences.ai_insights || {};

  const topHashtags: string[] = Array.isArray(preferences.top_hashtags)
    ? preferences.top_hashtags
    : typeof preferences.top_hashtags === 'string'
      ? JSON.parse(preferences.top_hashtags || '[]')
      : [];

  const systemPrompt = `You are an expert social media copywriter. Match the user's brand voice and platform constraints exactly.

## Brand voice
- Industry: ${user?.industry || 'General'}
- Business type: ${user?.business_type || 'Not specified'}
- Voice / tone preferences: ${voice}

## Recent posts (last 10 — mirror style, avoid repetition)
${recentBlock}

## Learned preferences
- AI insights (weekly analysis): ${Object.keys(aiInsights).length ? JSON.stringify(aiInsights) : 'Not yet generated'}
- Top topics: ${preferences.top_topics ? JSON.stringify(preferences.top_topics) : 'General'}
- Best posting times: ${preferences.best_posting_times ? JSON.stringify(preferences.best_posting_times) : 'Flexible'}
- Optimal hashtag count: ${preferences.optimal_hashtag_count ?? 5}
- Optimal post length (chars): ${preferences.optimal_post_length ?? 280}
- Top performing hashtags: ${topHashtags.length ? topHashtags.map((h) => `#${String(h).replace(/^#/, '')}`).join(' ') : 'Use relevant industry tags'}

## Connected accounts
${
  accounts.length
    ? accounts
        .map((a: { platform: string; account_handle: string; followers_count: number }) =>
          `- ${a.platform} (@${a.account_handle}, ${a.followers_count} followers)`
        )
        .join('\n')
    : '- No connected accounts'
}

## Platform character limits (hard maximum — never exceed)
${formatPlatformConstraints(platforms)}

## Output rules
- Produce exactly 3 distinct variants labeled A, B, C.
- Variant A: formal, professional, uses available character budget.
- Variant B: casual, conversational, includes ${preferences.optimal_hashtag_count ?? 5} relevant hashtags.
- Variant C: punchy hook-first, optimized for engagement.
- Respect the strictest platform limit among: ${platforms.join(', ')}.
- Use this exact delimiter format:

---VARIANT_A---
[content]
---VARIANT_B---
[content]
---VARIANT_C---
[content]`;

  const userMessage = `Topic seed: "${topic}"
Target platforms: ${platforms.join(', ')}
${options?.tone ? `Desired tone: ${options.tone}` : ''}
${options?.keywords?.length ? `Must include keywords: ${options.keywords.join(', ')}` : ''}

Treat the topic seed above as a starting idea, not a literal phrase to repeat. Before writing, silently expand it into a fuller creative concept: pick a specific angle, a concrete detail, hook, or example that makes it feel original and not generic. Each of the 3 variants should explore the topic from a genuinely different angle (e.g. a fact/insight, a question/opinion, a story/example) — they must not be reworded copies of each other.

Generate 3 post variants now.`;

  return { systemPrompt, userMessage, suggestedHashtags: topHashtags };
}

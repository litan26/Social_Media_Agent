import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { pool, setCurrentUser } from '../db/connection.js';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetriesPerRequest: 3 });

const cache = new Map<number, { data: unknown; at: number }>();
const CACHE_TTL = 60 * 60 * 1000;

router.get('/', authMiddleware, async (req, res) => {
  const forceRefresh = req.query.refresh === '1';
  const cached = cache.get(req.userId);
  if (!forceRefresh && cached && Date.now() - cached.at < CACHE_TTL) {
    res.json(cached.data);
    return;
  }

  try {
    await setCurrentUser(req.userId);

    const [userResult, postsResult, accountsResult] = await Promise.all([
      pool.query('SELECT industry, email, business_type FROM users WHERE id = $1', [req.userId]),
      pool.query('SELECT content, status FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [req.userId]),
      pool.query('SELECT platform, account_handle FROM social_accounts WHERE user_id = $1', [req.userId]),
    ]);

    const user = userResult.rows[0] || {};
    const recentPosts = postsResult.rows.map((r) => r.content).filter(Boolean);
    const platforms = accountsResult.rows.map((r) => r.platform);

    const platformList = platforms.length > 0 ? platforms.join(', ') : 'general social media';
    const industryCtx = user.industry || user.business_type || 'general business';
    const recentCtx = recentPosts.length > 0
      ? `Recent posts from this user:\n${recentPosts.map((p, i) => `${i + 1}. "${p}"`).join('\n')}`
      : 'No previous posts yet.';

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Industry-specific angles and themes
    const industryLowercase = industryCtx.toLowerCase();
    let industryAngles = '';
    if (industryLowercase.includes('tech') || industryLowercase.includes('software') || industryLowercase.includes('startup')) {
      industryAngles = 'Include angles like: product launches, engineering challenges, hiring, company culture, industry trends, founder insights, DevOps, AI/ML breakthroughs, security, scalability.';
    } else if (industryLowercase.includes('health') || industryLowercase.includes('medical') || industryLowercase.includes('fitness')) {
      industryAngles = 'Include angles like: wellness tips, health research summaries, case studies, patient testimonials, industry news, certifications, event announcements, lifestyle advice.';
    } else if (industryLowercase.includes('finance') || industryLowercase.includes('banking') || industryLowercase.includes('investment')) {
      industryAngles = 'Include angles like: market insights, financial literacy, risk management, industry updates, economic trends, client success stories, thought leadership, regulatory news.';
    } else if (industryLowercase.includes('retail') || industryLowercase.includes('ecommerce') || industryLowercase.includes('shop')) {
      industryAngles = 'Include angles like: product showcases, customer stories, seasonal promotions, behind-the-scenes, new arrivals, trending items, styling tips, customer reviews, flash sales.';
    } else if (industryLowercase.includes('real estate') || industryLowercase.includes('property')) {
      industryAngles = 'Include angles like: property listings, market trends, buyer tips, investment insights, home staging, neighborhood highlights, market analysis, agent spotlights.';
    } else if (industryLowercase.includes('food') || industryLowercase.includes('restaurant') || industryLowercase.includes('catering')) {
      industryAngles = 'Include angles like: recipe highlights, chef profiles, ingredient sourcing, cooking tips, customer features, menu specials, food trends, behind-the-scenes kitchen content.';
    } else if (industryLowercase.includes('education') || industryLowercase.includes('training') || industryLowercase.includes('learning')) {
      industryAngles = 'Include angles like: course announcements, student success stories, expert tips, learning hacks, industry certifications, webinars, research highlights, career guidance.';
    } else if (industryLowercase.includes('nonprofit') || industryLowercase.includes('charity') || industryLowercase.includes('social')) {
      industryAngles = 'Include angles like: impact stories, donor spotlights, volunteer highlights, cause awareness, event announcements, beneficiary testimonials, mission updates, community initiatives.';
    } else {
      industryAngles = 'Include diverse angles: industry news, customer stories, process/how-to content, behind-the-scenes, expert insights, case studies, trends, announcements.';
    }

    const prompt = `Today is ${today}.\n\nYou are a social media content strategist specializing in the ${industryCtx} industry. Generate 12 fresh, timely, and industry-specific post ideas for a user who posts on: ${platformList}.\n\n${recentCtx}\n\n${industryAngles}\n\nRequirements for EACH of the 12 ideas:\n- Be specific, actionable, and highly relevant to ${industryCtx}\n- Reflect current events, trends, or timely angles for ${today}\n- Vary the content types: at least 2 educational, 2 opinion, 2 story, 2 question, 2 list, 2 tip\n- Each idea must feel authentic to the ${industryCtx} space—not generic\n- Choose tone based on industry best practices: healthcare/finance/legal → professional; retail/food/lifestyle → casual; tech/startups → bold; nonprofits → professional or casual\n- Tone must be one of: professional, casual, bold\n\nRespond ONLY with a valid JSON array of exactly 12 objects. No markdown, no explanation, just the JSON.\n\nFormat:\n[\n  {\n    "title": "Short catchy headline (max 8 words)",\n    "topic": "The full post idea/prompt (1-2 sentences, specific and actionable)",\n    "type": "educational|opinion|story|question|list|tip",\n    "tone": "professional|casual|bold",\n    "hook": "Opening line to grab attention (max 15 words)"\n  }\n]`;

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      thinking: { type: 'adaptive' },
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Claude did not return a JSON array');

    const suggestions = JSON.parse(jsonMatch[0]);
    const data = {
      suggestions,
      industry: industryCtx,
      platforms,
      generated_at: new Date().toISOString(),
      total: suggestions.length,
    };

    cache.set(req.userId, { data, at: Date.now() });
    res.json(data);
  } catch (err: any) {
    console.error('Suggestions generation failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

import OpenAI from 'openai';
import { PlanService } from './plan.service.js';
import { assemblePromptContext } from './promptContext.service.js';
import { getMaxTokensFor } from '../config/platformLimits.js';

/** Model used for every post generation. */
const MODEL = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';

/** Groq exposes an OpenAI-compatible API, so the OpenAI SDK drives it. */
export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export class MissingApiKeyError extends Error {
  readonly statusCode = 503;

  constructor() {
    super(
      'Groq API key is not configured. Set GROQ_API_KEY in the backend .env file and restart the server.'
    );
    this.name = 'MissingApiKeyError';
  }
}

let client: OpenAI | null = null;

/**
 * Built lazily so the server still boots without a key — only generation
 * fails, and with a message that says exactly what to do. (The OpenAI
 * constructor throws on a missing key, so eager construction breaks boot.)
 */
function getClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new MissingApiKeyError();

  if (!client) {
    client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL, maxRetries: 3 });
  }
  return client;
}

/** True when a key is present — lets routes report status without generating. */
export function isClaudeConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export interface PostVariants {
  variantA: string;
  variantB: string;
  variantC: string;
}

function extractVariant(text: string, key: 'A' | 'B' | 'C'): string {
  const marker = `---VARIANT_${key}---`;
  const start = text.indexOf(marker);
  if (start === -1) return '';
  const after = text.slice(start + marker.length);
  const next = after.search(/---VARIANT_[ABC]---/);
  return (next === -1 ? after : after.slice(0, next)).trim();
}

export function parseVariantsFromText(text: string): PostVariants {
  return {
    variantA: extractVariant(text, 'A'),
    variantB: extractVariant(text, 'B'),
    variantC: extractVariant(text, 'C'),
  };
}

export class ClaudeService {
  static async assertGenerationLimit(userId: number, jwtPlan?: string | null): Promise<void> {
    await PlanService.assertAiGenerationAllowed(userId, jwtPlan);
  }

  static async generatePostVariants(
    userId: number,
    topic: string,
    platforms: string[],
    options?: { tone?: string; keywords?: string[]; jwtPlan?: string | null }
  ): Promise<PostVariants> {
    const openai = getClient();
    await this.assertGenerationLimit(userId, options?.jwtPlan);
    const { systemPrompt, userMessage } = await assemblePromptContext(
      userId,
      topic,
      platforms,
      options
    );

    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: getMaxTokensFor(platforms),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    const choice = completion.choices[0];
    if (choice?.finish_reason === 'content_filter') {
      throw new Error('The model declined this topic. Try rephrasing it.');
    }

    const text = choice?.message?.content ?? '';
    if (!text) throw new Error('The model returned an empty response');
    return parseVariantsFromText(text);
  }

  static async *streamPostVariants(
    userId: number,
    topic: string,
    platform: string,
    options?: { tone?: string; keywords?: string[]; jwtPlan?: string | null }
  ): AsyncGenerator<
    | { type: 'delta'; text: string }
    | { type: 'variant'; key: 'A' | 'B' | 'C'; content: string; platform: string }
    | { type: 'hashtags'; tags: string[] }
    | { type: 'done'; variants: PostVariants; platform: string }
  > {
    const openai = getClient();
    await this.assertGenerationLimit(userId, options?.jwtPlan);
    const { systemPrompt, userMessage, suggestedHashtags } = await assemblePromptContext(
      userId,
      topic,
      [platform],
      options
    );

    yield { type: 'hashtags', tags: suggestedHashtags };

    const stream = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: getMaxTokensFor([platform]),
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    let fullText = '';
    let finishReason: string | null = null;
    const emitted = new Set<'A' | 'B' | 'C'>();

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      if (choice.finish_reason) finishReason = choice.finish_reason;

      const delta = choice.delta?.content;
      if (!delta) continue;

      fullText += delta;
      yield { type: 'delta', text: delta };

      for (const key of ['A', 'B', 'C'] as const) {
        if (emitted.has(key)) continue;
        const trimmed = extractVariant(fullText, key);
        const ready =
          (key === 'A' && fullText.includes('---VARIANT_B---')) ||
          (key === 'B' && fullText.includes('---VARIANT_C---'));
        if (ready && trimmed) {
          emitted.add(key);
          yield { type: 'variant', key, content: trimmed, platform };
        }
      }
    }

    if (finishReason === 'content_filter') {
      throw new Error('The model declined this topic. Try rephrasing it.');
    }

    const variants = parseVariantsFromText(fullText);
    yield { type: 'done', variants, platform };
  }
}

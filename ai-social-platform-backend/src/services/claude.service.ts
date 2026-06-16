import Anthropic from '@anthropic-ai/sdk';
import { pool, setCurrentUser } from '../db/connection.js';
import { PlanService } from './plan.service.js';
import { assemblePromptContext } from './promptContext.service.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetriesPerRequest: 3,
});

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
    await this.assertGenerationLimit(userId, options?.jwtPlan);
    const { systemPrompt, userMessage } = await assemblePromptContext(
      userId,
      topic,
      platforms,
      options
    );

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const response = message.content[0];
    if (response.type !== 'text') throw new Error('Unexpected response type');
    return parseVariantsFromText(response.text);
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
    await this.assertGenerationLimit(userId, options?.jwtPlan);
    const { systemPrompt, userMessage, suggestedHashtags } = await assemblePromptContext(
      userId,
      topic,
      [platform],
      options
    );

    yield { type: 'hashtags', tags: suggestedHashtags };

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    let fullText = '';
    const emitted = new Set<'A' | 'B' | 'C'>();

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        fullText += event.delta.text;
        yield { type: 'delta', text: event.delta.text };

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
    }

    const variants = parseVariantsFromText(fullText);
    yield { type: 'done', variants, platform };
  }
}

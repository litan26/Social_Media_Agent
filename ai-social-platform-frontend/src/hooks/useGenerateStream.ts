import { useCallback, useState } from 'react';
import type { PostVariants } from '../types/post';

const API_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

export interface StreamState {
  streaming: boolean;
  streamText: string;
  variants: PostVariants | null;
  postId: number | null;
  hashtagSuggestions: string[];
  error: string | null;
}

function parseSseChunk(buffer: string): { events: { event: string; data: string }[]; rest: string } {
  const events: { event: string; data: string }[] = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() || '';

  for (const part of parts) {
    let event = 'message';
    let data = '';
    for (const line of part.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7);
      if (line.startsWith('data: ')) data = line.slice(6);
    }
    if (data) events.push({ event, data });
  }
  return { events, rest };
}

export function useGenerateStream() {
  const [state, setState] = useState<StreamState>({
    streaming: false,
    streamText: '',
    variants: null,
    postId: null,
    hashtagSuggestions: [],
    error: null,
  });

  const generate = useCallback(
    async (
      topic: string,
      platforms: string[],
      tone?: string,
      keywords?: string
    ): Promise<{ postId: number; variants: PostVariants } | null> => {
      const token = localStorage.getItem('token');
      setState({
        streaming: true,
        streamText: '',
        variants: null,
        postId: null,
        hashtagSuggestions: [],
        error: null,
      });

      let result: { postId: number; variants: PostVariants } | null = null;
      let partialVariants: PostVariants = { variantA: '', variantB: '', variantC: '' };

      try {
        const response = await fetch(`${API_URL}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ topic, platforms, tone, keywords }),
        });

        if (!response.ok || !response.body) {
          const err = await response.json().catch(() => ({ error: 'Generation failed' }));
          const body = err as { error?: string; upgrade?: boolean };
          if (response.status === 402) {
            throw new Error(body.error || 'Plan limit reached — upgrade to continue');
          }
          throw new Error(body.error || 'Generation failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, rest } = parseSseChunk(buffer);
          buffer = rest;

          for (const { event, data } of events) {
            const payload = JSON.parse(data) as Record<string, unknown>;

            if (event === 'delta') {
              setState((s) => ({
                ...s,
                streamText: s.streamText + String(payload.text || ''),
              }));
            }

            if (event === 'hashtags') {
              setState((s) => ({
                ...s,
                hashtagSuggestions: (payload.tags as string[]) || [],
              }));
            }

            if (event === 'variant') {
              const key = payload.key as 'A' | 'B' | 'C';
              const field = `variant${key}` as keyof PostVariants;
              partialVariants = {
                ...partialVariants,
                [field]: String(payload.content || ''),
              };
              setState((s) => ({ ...s, variants: { ...partialVariants } }));
            }

            if (event === 'draft') {
              const variants = payload.variants as PostVariants;
              const postId = payload.postId as number;
              partialVariants = variants;
              if (!result) {
                result = { postId, variants };
              }
              setState((s) => ({
                ...s,
                postId: result?.postId ?? postId,
                variants: result?.variants ?? variants,
              }));
            }

            if (event === 'error') {
              throw new Error(String(payload.error || 'Generation failed'));
            }
          }
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Generation failed';
        setState((s) => ({ ...s, error: message }));
        throw e;
      } finally {
        setState((s) => ({ ...s, streaming: false }));
      }

      return result;
    },
    []
  );

  return { ...state, generate };
}

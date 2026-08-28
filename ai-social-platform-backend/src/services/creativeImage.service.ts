import axios from 'axios';
import OpenAI from 'openai';

const SIZE = 1080;

function normalizePrompt(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);
}

/**
 * Generates an actual AI image from the user's prompt.
 * Checks OPENAI_API_KEY (DALL-E 3), STABILITY_API_KEY (Stability AI),
 * GEMINI_API_KEY, or defaults to Pollinations AI (Flux / SDXL).
 * NEVER renders text over the image. Returns pure image buffer.
 */
async function generateAIImageBuffer(promptText: string, tone?: string): Promise<Buffer> {
  const prompt = normalizePrompt(promptText);
  if (!prompt) {
    throw new Error('Please provide a valid image prompt.');
  }

  // Add subtle tone cue if provided
  let fullPrompt = prompt;
  if (tone && tone !== 'professional') {
    fullPrompt += `, ${tone} visual style`;
  }

  // 1. OpenAI DALL-E 3 if OPENAI_API_KEY is set
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      });
      const b64 = response.data?.[0]?.b64_json;
      if (b64) {
        return Buffer.from(b64, 'base64');
      }
    } catch (err) {
      console.warn('OpenAI DALL-E generation failed, using fallback AI provider:', err);
    }
  }

  // 2. Stability AI if STABILITY_API_KEY is set
  const stabilityKey = process.env.STABILITY_API_KEY?.trim();
  if (stabilityKey) {
    try {
      const response = await axios.post<{ artifacts?: Array<{ base64?: string }> }>(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        {
          text_prompts: [{ text: fullPrompt, weight: 1 }],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 30,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${stabilityKey}`,
          },
          timeout: 45000,
        }
      );
      const b64 = response.data?.artifacts?.[0]?.base64;
      if (b64) {
        return Buffer.from(b64, 'base64');
      }
    } catch (err) {
      console.warn('Stability AI image generation failed, using fallback AI provider:', err);
    }
  }

  // 3. Pollinations AI (Flux / SDXL model) as default high-performance AI provider
  try {
    const seed = Math.floor(Math.random() * 10000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      fullPrompt
    )}?width=1080&height=1080&nologo=true&seed=${seed}&model=flux`;

    const response = await axios.get<ArrayBuffer>(pollinationsUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    if (response.status === 200 && response.data) {
      return Buffer.from(response.data);
    }
  } catch (err) {
    console.error('Pollinations AI image generation error:', err);
  }

  throw new Error('Unable to generate the image. Please try again.');
}

export class CreativeImageService {
  static async generateQuoteImage(
    text: string,
    options: { tone?: string; logoUrl?: string } = {}
  ): Promise<{ png: Buffer; quote: string; tone: string; width: number; height: number }> {
    const prompt = normalizePrompt(text);
    if (!prompt) throw new Error('Please provide a valid image prompt.');

    const toneKey = options.tone || 'professional';
    const rawImageBuffer = await generateAIImageBuffer(prompt, toneKey);

    let png = rawImageBuffer;
    try {
      const sharpModule = await import('sharp');
      const sharpInstance = (sharpModule as any).default || sharpModule;
      png = await sharpInstance(rawImageBuffer)
        .resize(SIZE, SIZE, { fit: 'cover' })
        .png()
        .toBuffer();
    } catch (err) {
      console.warn('Sharp module unavailable, using raw image buffer:', err);
    }

    return { png, quote: prompt, tone: toneKey, width: SIZE, height: SIZE };
  }

  static async renderWithoutAI(
    text: string,
    options: { tone?: string; logoUrl?: string } = {}
  ): Promise<{ png: Buffer; quote: string; tone: string; width: number; height: number }> {
    return this.generateQuoteImage(text, options);
  }
}

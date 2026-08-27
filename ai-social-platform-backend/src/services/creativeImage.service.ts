import sharp from 'sharp';
import axios from 'axios';

const SIZE = 1080;
const GEMINI_IMAGE_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image';

const TONE_STYLES: Record<string, { accent: string; mood: string; overlay: string }> = {
  professional: {
    accent: '#38bdf8',
    mood: 'premium editorial, refined, optimistic, modern business photography',
    overlay: 'rgba(15,23,42,0.50)',
  },
  casual: {
    accent: '#fde047',
    mood: 'warm lifestyle photography, energetic, friendly, colorful but polished',
    overlay: 'rgba(39,22,10,0.42)',
  },
  bold: {
    accent: '#f472b6',
    mood: 'dramatic campaign poster, high contrast, confident, cinematic lighting',
    overlay: 'rgba(15,10,30,0.48)',
  },
};

export class MissingGeminiApiKeyError extends Error {
  readonly statusCode = 503;

  constructor() {
    super(
      'Gemini API key is not configured. Set GEMINI_API_KEY in the backend .env file and restart the server.'
    );
    this.name = 'MissingGeminiApiKeyError';
  }
}

/**
 * Raised when Gemini rejects the request for quota. On the free tier the image
 * models report limit: 0, so this means billing is not enabled on the Google
 * Cloud project behind the API key.
 */
export class GeminiQuotaError extends Error {
  readonly statusCode = 429;

  constructor(detail: string) {
    super(
      'Gemini image generation is out of quota for this API key. Image models ' +
        'are not available on the free tier — enable billing on the Google Cloud ' +
        `project to use them. (${detail.slice(0, 200)})`
    );
    this.name = 'GeminiQuotaError';
  }
}

type GeminiInteractionResponse = {
  output_image?: { data?: string; mime_type?: string };
  outputImage?: { data?: string; mimeType?: string };
  // The live /interactions response returns the image inside the step list:
  // a `thought` step followed by a `model_output` step whose content array
  // holds the base64 payload. The flat output_image fields above are kept as
  // fallbacks in case the endpoint also returns that shape.
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; data?: string; mime_type?: string }>;
  }>;
};

/** Pull the base64 image out of whichever shape the endpoint returned. */
function extractImageData(body: GeminiInteractionResponse): string | undefined {
  for (const step of body.steps ?? []) {
    for (const part of step.content ?? []) {
      if (part?.data && (part.type === 'image' || part.mime_type?.startsWith('image/'))) {
        return part.data;
      }
    }
  }
  return body.output_image?.data || body.outputImage?.data;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeQuote(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#@][\w-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 7);
}

async function fetchLogoAsBase64(logoUrl: string): Promise<string | null> {
  try {
    const response = await axios.get<ArrayBuffer>(logoUrl, {
      responseType: 'arraybuffer',
      timeout: 5000,
    });
    const contentType = response.headers['content-type'] || 'image/png';
    return `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`;
  } catch {
    return null;
  }
}

async function generateGeminiBackground(quote: string, tone: string): Promise<Buffer> {
  // .env currently spells this GIMINI_API_KEY; accept both so either works.
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GIMINI_API_KEY)?.trim();
  if (!apiKey) throw new MissingGeminiApiKeyError();

  const style = TONE_STYLES[tone] || TONE_STYLES.professional;
  const model = process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_GEMINI_IMAGE_MODEL;
  const prompt = [
    `Create a square 1:1 social media background for this quote: "${quote}".`,
    `Visual mood: ${style.mood}.`,
    'No text, no letters, no logos, no watermark-looking marks.',
    'Leave a calm, darker central area with clean negative space for quote typography.',
    'Use sophisticated depth, texture, lighting, and a polished social campaign look.',
  ].join(' ');

  let response;
  try {
    response = await axios.post<GeminiInteractionResponse>(
      GEMINI_IMAGE_URL,
      {
        model,
        input: [{ type: 'text', text: prompt }],
        response_format: {
          type: 'image',
          // The interactions endpoint only accepts image/jpeg here; image/png
          // is rejected with a 400. Output is re-encoded to PNG after compositing.
          mime_type: 'image/jpeg',
          aspect_ratio: '1:1',
          image_size: '1K',
        },
      },
      {
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 90000,
      }
    );
  } catch (error: unknown) {
    // Axios reports only "Request failed with status code N"; Google puts the
    // actual reason in the response body, so surface that instead.
    if (axios.isAxiosError(error) && error.response) {
      const body = error.response.data as { error?: { message?: string } };
      const detail = body?.error?.message || JSON.stringify(body).slice(0, 300);

      if (error.response.status === 429) {
        throw new GeminiQuotaError(detail);
      }
      throw new Error(`Gemini image request failed (${error.response.status}): ${detail}`);
    }
    throw error;
  }

  const base64Image = extractImageData(response.data);
  if (!base64Image) {
    throw new Error('Gemini did not return an image. Try a different quote or tone.');
  }

  return Buffer.from(base64Image, 'base64');
}

async function renderQuoteOverlay(
  background: Buffer,
  quote: string,
  options: { tone?: string; logoUrl?: string } = {}
): Promise<Buffer> {
  const toneKey = options.tone && TONE_STYLES[options.tone] ? options.tone : 'professional';
  const style = TONE_STYLES[toneKey];
  const lines = wrapText(quote, 24);
  const fontSize = lines.length > 5 ? 48 : lines.length > 3 ? 54 : 62;
  const lineHeight = Math.round(fontSize * 1.25);
  const totalTextHeight = lines.length * lineHeight;
  const startY = (SIZE - totalTextHeight) / 2 + fontSize * 0.78;
  const quoteMarkY = startY - 86;

  const textSvg = lines
    .map(
      (line, i) =>
        `<text x="${SIZE / 2}" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${fontSize}" fill="#ffffff" style="filter:drop-shadow(0 4px 16px rgba(0,0,0,0.65))">${escapeXml(line)}</text>`
    )
    .join('\n');

  let logoSvg = '';
  if (options.logoUrl) {
    const dataUri = await fetchLogoAsBase64(options.logoUrl);
    if (dataUri) {
      logoSvg = `
        <circle cx="100" cy="100" r="56" fill="rgba(255,255,255,0.14)" />
        <circle cx="100" cy="100" r="56" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="2" />
        <clipPath id="logoClip"><circle cx="100" cy="100" r="44" /></clipPath>
        <image x="56" y="56" width="88" height="88" href="${dataUri}" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid slice" />
      `;
    }
  }

  const svg = `
    <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="centerShade" cx="50%" cy="47%" r="58%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.22" />
          <stop offset="72%" stop-color="#000000" stop-opacity="0.34" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.58" />
        </radialGradient>
      </defs>

      <rect width="${SIZE}" height="${SIZE}" fill="${style.overlay}" />
      <rect width="${SIZE}" height="${SIZE}" fill="url(#centerShade)" />
      <rect x="84" y="120" width="${SIZE - 168}" height="${SIZE - 240}" rx="36" fill="rgba(0,0,0,0.16)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" />

      ${logoSvg}

      <text x="${SIZE / 2}" y="${quoteMarkY}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="96" fill="${style.accent}" opacity="0.92">"</text>
      ${textSvg}
      <rect x="${SIZE / 2 - 58}" y="${startY + totalTextHeight - lineHeight * 0.55 + 42}" width="116" height="5" rx="2.5" fill="${style.accent}" />
    </svg>
  `.trim();

  return sharp(background)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

export class CreativeImageService {
  static async generateQuoteImage(
    text: string,
    options: { tone?: string; logoUrl?: string } = {}
  ): Promise<{ png: Buffer; quote: string; tone: string; width: number; height: number }> {
    const quote = normalizeQuote(text);
    if (!quote) throw new Error('Quote text is required');

    const toneKey = options.tone && TONE_STYLES[options.tone] ? options.tone : 'professional';
    const background = await generateGeminiBackground(quote, toneKey);
    const png = await renderQuoteOverlay(background, quote, options);

    return { png, quote, tone: toneKey, width: SIZE, height: SIZE };
  }

  /**
   * Renders the quote frame over a locally generated backdrop, with no call to
   * Gemini. Used to verify the compositing half of the pipeline in isolation.
   */
  static async renderWithoutAI(
    text: string,
    options: { tone?: string; logoUrl?: string } = {}
  ): Promise<{ png: Buffer; quote: string; tone: string; width: number; height: number }> {
    const quote = normalizeQuote(text);
    if (!quote) throw new Error('Quote text is required');

    const toneKey = options.tone && TONE_STYLES[options.tone] ? options.tone : 'professional';
    const style = TONE_STYLES[toneKey];
    const backdrop = Buffer.from(
      `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
         <defs>
           <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
             <stop offset="0%" stop-color="${style.accent}" />
             <stop offset="100%" stop-color="#0f172a" />
           </linearGradient>
         </defs>
         <rect width="${SIZE}" height="${SIZE}" fill="url(#g)" />
       </svg>`
    );

    const background = await sharp(backdrop).png().toBuffer();
    const png = await renderQuoteOverlay(background, quote, options);

    return { png, quote, tone: toneKey, width: SIZE, height: SIZE };
  }
}

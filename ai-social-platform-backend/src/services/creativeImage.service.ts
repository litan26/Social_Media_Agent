import sharp from 'sharp';
import axios from 'axios';

const TONE_PALETTES: Record<string, [string, string, string, string]> = {
  // [gradientStart, gradientMid, gradientEnd, accent]
  professional: ['#0f172a', '#1e293b', '#1e3a5f', '#38bdf8'],
  casual: ['#ea580c', '#f97316', '#ec4899', '#fde047'],
  bold: ['#581c87', '#7c3aed', '#db2777', '#f472b6'],
};

const TONE_KICKER: Record<string, string> = {
  professional: 'INSIGHT',
  casual: 'TRENDING NOW',
  bold: 'MAKE A STATEMENT',
};

const SIZE = 1080;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  return lines.slice(0, 6);
}

async function fetchLogoAsBase64(logoUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(logoUrl, { responseType: 'arraybuffer', timeout: 5000 });
    const contentType = response.headers['content-type'] || 'image/png';
    return `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`;
  } catch {
    return null;
  }
}

export class CreativeImageService {
  static async generateCard(
    text: string,
    options: { tone?: string; logoUrl?: string } = {}
  ): Promise<Buffer> {
    const toneKey = options.tone && TONE_PALETTES[options.tone] ? options.tone : 'professional';
    const [colorA, colorB, colorC, accent] = TONE_PALETTES[toneKey];
    const kicker = TONE_KICKER[toneKey];

    const lines = wrapText(text, 22);
    const lineHeight = 70;
    const totalTextHeight = lines.length * lineHeight;
    const startY = (SIZE - totalTextHeight) / 2 + lineHeight * 0.65;
    const accentLineY = startY + totalTextHeight - lineHeight * 0.55 + 36;
    const accentLineWidth = 110;

    const textSvg = lines
      .map(
        (line, i) =>
          `<text x="${SIZE / 2}" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="56" fill="#ffffff" style="filter:drop-shadow(0 3px 10px rgba(0,0,0,0.45))">${escapeXml(line)}</text>`
      )
      .join('\n');

    let logoSvg = '';
    if (options.logoUrl) {
      const dataUri = await fetchLogoAsBase64(options.logoUrl);
      if (dataUri) {
        logoSvg = `
          <circle cx="100" cy="100" r="56" fill="rgba(255,255,255,0.12)" />
          <circle cx="100" cy="100" r="56" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2" />
          <clipPath id="logoClip"><circle cx="100" cy="100" r="44" /></clipPath>
          <image x="56" y="56" width="88" height="88" href="${dataUri}" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid slice" />
        `;
      }
    }

    const svg = `
      <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colorA}" />
            <stop offset="55%" stop-color="${colorB}" />
            <stop offset="100%" stop-color="${colorC}" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.10" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
          <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">
            <path d="M0 54 L54 0" stroke="rgba(255,255,255,0.035)" stroke-width="1" />
          </pattern>
        </defs>

        <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)" />
        <rect width="${SIZE}" height="${SIZE}" fill="url(#grid)" />
        <rect width="${SIZE}" height="${SIZE}" fill="url(#glow)" />

        <circle cx="${SIZE - 80}" cy="80" r="220" fill="#ffffff" opacity="0.04" />
        <circle cx="60" cy="${SIZE - 60}" r="280" fill="#000000" opacity="0.10" />

        ${logoSvg}

        <!-- Kicker tag -->
        <rect x="${SIZE / 2 - 130}" y="${startY - 130}" width="260" height="44" rx="22" fill="rgba(255,255,255,0.12)" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.6" />
        <text x="${SIZE / 2}" y="${startY - 100}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="20" letter-spacing="3" fill="${accent}">${kicker}</text>

        ${textSvg}

        <rect x="${SIZE / 2 - accentLineWidth / 2}" y="${accentLineY}" width="${accentLineWidth}" height="5" rx="2.5" fill="${accent}" />

        <!-- Bottom-right brand mark -->
        <text x="${SIZE - 48}" y="${SIZE - 44}" text-anchor="end" font-family="Arial, sans-serif" font-weight="600" font-size="18" letter-spacing="2" fill="rgba(255,255,255,0.45)">CREATED WITH AI</text>
      </svg>
    `.trim();

    return sharp(Buffer.from(svg)).png().toBuffer();
  }
}

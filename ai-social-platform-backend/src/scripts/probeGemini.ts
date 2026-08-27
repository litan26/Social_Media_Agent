/**
 * Diagnostic: asks the Gemini API which models this key can use, then tries
 * the image-generation call shapes. Prints error bodies so a 400 is readable.
 * The key itself is never printed.
 *
 *   npx tsx src/scripts/probeGemini.ts
 */
import dotenv from 'dotenv';

dotenv.config();

const KEY = (process.env.GEMINI_API_KEY || process.env.GIMINI_API_KEY)?.trim();

async function main() {
  if (!KEY) {
    console.error('No GEMINI_API_KEY / GIMINI_API_KEY found in .env');
    process.exit(1);
  }
  console.log(`key loaded (${KEY.length} chars, starts "${KEY.slice(0, 4)}...")\n`);

  // 1. Which models does this key actually have access to?
  console.log('--- ListModels ---');
  const listRes = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',
    { headers: { 'x-goog-api-key': KEY } }
  );
  console.log(`status ${listRes.status}`);
  const listBody = await listRes.json();

  if (!listRes.ok) {
    console.log(JSON.stringify(listBody, null, 2).slice(0, 1200));
    return;
  }

  const models: Array<{ name: string; supportedGenerationMethods?: string[] }> =
    listBody.models || [];
  const imageModels = models.filter(
    (m) => /image|imagen/i.test(m.name) && !/embed/i.test(m.name)
  );

  console.log(`${models.length} models visible; image-capable candidates:`);
  for (const m of imageModels) {
    console.log(`  ${m.name}  [${(m.supportedGenerationMethods || []).join(', ')}]`);
  }
  if (imageModels.length === 0) {
    console.log('  (none — this key may not have image generation enabled)');
  }

  // 2. Does the endpoint currently in the code exist at all?
  console.log('\n--- current code path: v1beta/interactions ---');
  const interactionsRes = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/interactions',
    {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-3.1-flash-image',
        input: [{ type: 'text', text: 'a plain blue square' }],
        response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '1:1' },
      }),
    }
  );
  console.log(`status ${interactionsRes.status}`);
  console.log((await interactionsRes.text()).slice(0, 700));

  // 3. Try generateContent on each candidate image model.
  for (const m of imageModels.slice(0, 4)) {
    const short = m.name.replace(/^models\//, '');
    console.log(`\n--- generateContent: ${short} ---`);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${m.name}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'A plain blue square, no text.' }] }],
        }),
      }
    );
    console.log(`status ${res.status}`);
    const text = await res.text();

    if (res.ok) {
      const parsed = JSON.parse(text);
      const parts = parsed.candidates?.[0]?.content?.parts || [];
      const img = parts.find(
        (p: Record<string, unknown>) => p.inlineData || p.inline_data
      );
      const inline = (img?.inlineData || img?.inline_data) as
        | { mimeType?: string; mime_type?: string; data?: string }
        | undefined;
      console.log(
        img
          ? `  IMAGE RETURNED  mime=${inline?.mimeType || inline?.mime_type}  bytes~${Math.round((inline?.data?.length || 0) * 0.75)}`
          : `  no image part; parts: ${parts.map((p: object) => Object.keys(p).join('+')).join(', ')}`
      );
    } else {
      console.log(`  ${text.slice(0, 500)}`);
    }
  }
}

main().catch((e) => {
  console.error('probe failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});

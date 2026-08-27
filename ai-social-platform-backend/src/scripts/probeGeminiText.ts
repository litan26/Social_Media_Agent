/**
 * Narrows down a 429: does the key work for TEXT generation?
 *   - text ok + image 429  -> key is valid, image models need billing
 *   - text also 429        -> the whole key/project has no quota
 *
 *   npx tsx src/scripts/probeGeminiText.ts
 */
import dotenv from 'dotenv';

dotenv.config();

const KEY = (process.env.GEMINI_API_KEY || process.env.GIMINI_API_KEY)?.trim();

async function tryModel(model: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say OK.' }] }],
      }),
    }
  );

  const text = await res.text();
  if (res.ok) {
    const parsed = JSON.parse(text);
    const out = parsed.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    console.log(`  ${model.padEnd(28)} ${res.status}  -> "${out}"`);
    return true;
  }

  // Only a 429 says anything about quota. 404 = model not exposed to this key,
  // 503 = Google-side overload; neither implies a billing problem.
  const note =
    res.status === 429
      ? /free_tier/.test(text)
        ? 'QUOTA free_tier'
        : 'QUOTA paid'
      : res.status === 503
        ? 'model overloaded (retry)'
        : res.status === 404
          ? 'model not available to this key'
          : 'other';
  console.log(`  ${model.padEnd(28)} ${res.status}  (${note})`);
  return res.status !== 429;
}

async function main() {
  if (!KEY) {
    console.error('no key found');
    process.exit(1);
  }

  console.log('--- TEXT models (cheapest signal of billing state) ---');
  const results = [];
  for (const m of ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']) {
    results.push(await tryModel(m));
  }

  console.log(
    results.some(Boolean)
      ? '\nNo quota block on text -> key is valid; image models are the gated part.'
      : '\nText hit 429 too -> the project itself has no quota.'
  );
}

main().catch((e) => {
  console.error('failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});

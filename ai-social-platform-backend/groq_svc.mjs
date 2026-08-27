import dotenv from 'dotenv'; dotenv.config();
const m = await import('./src/services/claude.service.ts');
console.log('configured:', m.isClaudeConfigured(), '| baseURL:', m.GROQ_BASE_URL);
console.log('model:', process.env.GROQ_MODEL);
// direct stream through the real SDK config the service uses
const OpenAI = (await import('openai')).default;
const c = new OpenAI({ apiKey: process.env.GROQ_API_KEY.trim(), baseURL: m.GROQ_BASE_URL, maxRetries: 1 });
const stream = await c.chat.completions.create({
  model: process.env.GROQ_MODEL, max_tokens: 400, stream: true,
  messages: [
    { role: 'system', content: 'You write social posts. Use this exact delimiter format:\n---VARIANT_A---\n[content]\n---VARIANT_B---\n[content]\n---VARIANT_C---\n[content]' },
    { role: 'user', content: 'Topic: launching a new coffee subscription. Generate 3 post variants now.' },
  ],
});
let full=''; for await (const ch of stream) { const d=ch.choices[0]?.delta?.content; if(d) full+=d; }
const v = m.parseVariantsFromText(full);
console.log('--- PARSED VARIANTS ---');
console.log('A:', v.variantA.slice(0,70));
console.log('B:', v.variantB.slice(0,70));
console.log('C:', v.variantC.slice(0,70));
console.log('all three present:', Boolean(v.variantA && v.variantB && v.variantC));
process.exit(0);

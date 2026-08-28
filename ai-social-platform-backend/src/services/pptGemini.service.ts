import axios from 'axios';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { CreativeImageService } from './creativeImage.service.js';

export interface SlideContent {
  bulletPoints?: string[];
  paragraphs?: string[];
  keyMetrics?: Array<{ label: string; value: string; trend?: string }>;
  quoteText?: string;
  quoteAuthor?: string;
  comparisonColumns?: Array<{ title: string; points: string[] }>;
  timelineSteps?: Array<{ step: string; title: string; description: string }>;
  processSteps?: Array<{ step: number; title: string; description: string }>;
  calloutBox?: { title?: string; text: string; type?: 'info' | 'tip' | 'warning' };
}

export interface SlideChart {
  type: 'bar' | 'line' | 'pie' | 'area' | 'kpi';
  title: string;
  labels: string[];
  datasets: Array<{ label: string; data: number[] }>;
}

export interface SlideTable {
  headers: string[];
  rows: string[][];
}

export interface SlideImage {
  url?: string;
  alt?: string;
  prompt?: string;
}

export interface SlideVisuals {
  image?: SlideImage;
  chart?: SlideChart;
  table?: SlideTable;
  icon?: string;
}

export interface SlideItem {
  id?: number;
  position: number;
  layout:
    | 'title'
    | 'title_content'
    | 'two_column'
    | 'image_text'
    | 'full_image'
    | 'stats'
    | 'chart'
    | 'table'
    | 'timeline'
    | 'process'
    | 'comparison'
    | 'quote'
    | 'section_divider'
    | 'conclusion'
    | 'thank_you';
  title: string;
  subtitle?: string;
  content: SlideContent;
  visuals?: SlideVisuals;
  speakerNotes?: string;
  styling?: Record<string, any>;
}

export interface ColorTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
}

export interface PresentationOptions {
  topic: string;
  lengthCategory: 'Short' | 'Informative' | 'Detailed';
  industry?: string;
  style?: string;
  colorTheme?: ColorTheme;
  ratio?: string;
  audience?: string;
  tone?: string;
  language?: string;
  additionalInstructions?: string;
  isLessonPlan?: boolean;
}

export class PptGeminiService {
  /**
   * Safe call to Gemini 2.5 Flash / 1.5 Flash API with quota optimization
   */
  private static async callGeminiApi(systemPrompt: string, userPrompt: string, imageBuffer?: { buffer: Buffer; mimeType: string }): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    
    // Fallback to OpenAI / Groq if Gemini key is missing or for redundancy
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not set. Using structured JSON generator fallback.');
      return this.callFallbackOpenAI(systemPrompt, userPrompt);
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const parts: any[] = [{ text: `${systemPrompt}\n\nUSER REQUEST:\n${userPrompt}` }];

    if (imageBuffer) {
      parts.push({
        inlineData: {
          mimeType: imageBuffer.mimeType,
          data: imageBuffer.buffer.toString('base64'),
        },
      });
    }

    try {
      const response = await axios.post(
        endpoint,
        {
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
            maxOutputTokens: 8192,
          },
        },
        { timeout: 60000, headers: { 'Content-Type': 'application/json' } }
      );

      const candidate = response.data?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Gemini API returned an empty response.');
      }

      return JSON.parse(text);
    } catch (err: any) {
      console.error('Gemini API call failed, trying gemini-1.5-flash fallback:', err.message || err);
      // Fallback model call
      try {
        const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const fallbackRes = await axios.post(
          fallbackEndpoint,
          {
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.4,
              maxOutputTokens: 8192,
            },
          },
          { timeout: 60000, headers: { 'Content-Type': 'application/json' } }
        );
        const text = fallbackRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return JSON.parse(text);
      } catch (fallbackErr) {
        console.error('Gemini fallback model also failed. Attempting Groq fallback...');
      }
      return this.callFallbackOpenAI(systemPrompt, userPrompt);
    }
  }

  /**
   * Fallback using Groq or OpenAI if Gemini API fails or is unconfigured
   */
  private static async callFallbackOpenAI(systemPrompt: string, userPrompt: string): Promise<any> {
    const groqKey = process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!groqKey) {
      throw new Error('AI API key is missing. Please configure GEMINI_API_KEY or GROQ_API_KEY in backend .env.');
    }

    const baseURL = process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined;
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const response = await axios.post(
      `${baseURL || 'https://api.openai.com/v1'}/chat/completions`,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt + '\nRespond ONLY with raw valid JSON.' },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 8192,
      },
      {
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const raw = response.data?.choices?.[0]?.message?.content || '';
    const cleanJsonStr = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJsonStr);
  }

  /**
   * Extract text from uploaded files (PDF, DOCX, XLSX, TXT, PNG, JPG)
   */
  static async extractFileContent(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<{ text: string; excelData?: any; isImage?: boolean }> {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';

    if (ext === 'pdf' || file.mimetype === 'application/pdf') {
      try {
        if (typeof (globalThis as any).DOMMatrix === 'undefined') {
          (globalThis as any).DOMMatrix = class DOMMatrix {};
        }
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = (pdfParseModule as any).default || pdfParseModule;
        const parsed = await pdfParse(file.buffer);
        return { text: parsed.text || '' };
      } catch (err) {
        console.warn('PDF parsing fallback:', err);
        return { text: file.buffer.toString('utf8') };
      }
    }

    if (ext === 'docx' || ext === 'doc' || file.mimetype.includes('wordprocessingml')) {
      const parsed = await mammoth.extractRawText({ buffer: file.buffer });
      return { text: parsed.value || '' };
    }

    if (ext === 'xlsx' || ext === 'xls' || file.mimetype.includes('spreadsheet')) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      let combinedText = '';
      const excelTables: any[] = [];

      for (const name of sheetNames) {
        const sheet = workbook.Sheets[name];
        const json = xlsx.utils.sheet_to_json<Record<string, any>>(sheet);
        combinedText += `\nSheet: ${name}\n` + JSON.stringify(json, null, 2);
        excelTables.push({ sheetName: name, data: json });
      }
      return { text: combinedText, excelData: excelTables };
    }

    if (['png', 'jpg', 'jpeg'].includes(ext) || file.mimetype.startsWith('image/')) {
      return { text: `[Image content: ${file.originalname}]`, isImage: true };
    }

    // Default TXT or raw text
    return { text: file.buffer.toString('utf8') };
  }

  /**
   * Enforces target slide counts:
   * Short: 7–8
   * Informative: 9–12
   * Detailed: 12–16
   */
  public static getTargetSlideRange(lengthCategory: 'Short' | 'Informative' | 'Detailed'): { min: number; max: number; target: number } {
    switch (lengthCategory) {
      case 'Short':
        return { min: 7, max: 8, target: 8 };
      case 'Detailed':
        return { min: 12, max: 16, target: 14 };
      case 'Informative':
      default:
        return { min: 9, max: 12, target: 10 };
    }
  }

  /**
   * Generate Full Presentation Presentation JSON
   */
  static async generatePresentation(options: PresentationOptions, file?: { buffer: Buffer; originalname: string; mimetype: string }): Promise<{
    title: string;
    slides: SlideItem[];
  }> {
    let sourceText = options.topic;
    let excelData: any = null;
    let imageInfo: { buffer: Buffer; mimeType: string } | undefined = undefined;

    if (file) {
      const extracted = await this.extractFileContent(file);
      if (extracted.isImage) {
        imageInfo = { buffer: file.buffer, mimeType: file.mimetype };
        sourceText = `Analyze this uploaded image and generate a presentation based on its content. User instruction: ${options.topic || 'Create presentation from image'}`;
      } else {
        sourceText = `Extracted File (${file.originalname}):\n${extracted.text}\n\nAdditional Instruction: ${options.topic || ''}`;
        excelData = extracted.excelData;
      }
    }

    const range = this.getTargetSlideRange(options.lengthCategory);

    const systemPrompt = `You are a world-class executive presentation designer and expert content strategist.
Your task is to generate a comprehensive, highly engaging, visually varied presentation.

CRITICAL SLIDE COUNT RULE:
You MUST generate between ${range.min} and ${range.max} slides. Aim for exactly ${range.target} slides.
Do NOT generate fewer than ${range.min} slides or more than ${range.max} slides.

PRESENTATION PARAMETERS:
- Audience: ${options.audience || 'General Audience'}
- Tone: ${options.tone || 'Professional'}
- Language: ${options.language || 'English'}
- Style: ${options.style || 'Modern'}
- Industry: ${options.industry || 'Business'}
${options.isLessonPlan ? '- Mode: AI Lesson Plan Preset (Include Learning Objectives, Introduction, Key Concepts, Teaching Material, Examples, Activities, Questions, Assessment, Summary, Homework).' : ''}
${options.additionalInstructions ? `- Special Instructions: ${options.additionalInstructions}` : ''}

JSON RESPONSE FORMAT:
Return a single valid JSON object matching this structure EXACTLY:
{
  "title": "Main Presentation Title",
  "slides": [
    {
      "position": 1,
      "layout": "title",
      "title": "Title Text",
      "subtitle": "Subtitle Text",
      "content": {
        "bulletPoints": ["Point 1", "Point 2"],
        "paragraphs": ["Summary text"],
        "keyMetrics": [{"label": "Revenue", "value": "$5M", "trend": "+15%"}],
        "quoteText": "Optional quote",
        "quoteAuthor": "Author",
        "comparisonColumns": [{"title": "Col A", "points": ["P1"]}],
        "timelineSteps": [{"step": "Phase 1", "title": "Discovery", "description": "Details"}],
        "processSteps": [{"step": 1, "title": "Step 1", "description": "Details"}],
        "calloutBox": {"title": "Key Takeaway", "text": "Crucial info", "type": "info"}
      },
      "visuals": {
        "image": {"prompt": "Detailed AI image generation prompt for this slide"},
        "chart": {
          "type": "bar",
          "title": "Chart Title",
          "labels": ["Jan", "Feb", "Mar"],
          "datasets": [{"label": "Sales", "data": [10, 20, 30]}]
        },
        "table": {
          "headers": ["Header 1", "Header 2"],
          "rows": [["Cell 1", "Cell 2"]]
        }
      },
      "speakerNotes": "Detailed speaker notes for the presenter."
    }
  ]
}

LAYOUT RULES:
- Slide 1 MUST be "title" layout.
- The final slide MUST be "thank_you" or "conclusion" layout.
- Vary layouts across slides: "title_content", "two_column", "image_text", "stats", "chart", "table", "timeline", "process", "comparison", "quote", "section_divider".
- DO NOT put an image on every slide. Include "image" prompt only on slides that truly benefit from visuals.
- If source contains numeric data or stats (especially Excel data), create real "chart" or "table" or "stats" visuals!
- Ensure all text is concise, impactful, and grammatically perfect.`;

    const userPrompt = `Source Content to convert into a ${range.target}-slide presentation:\n\n${sourceText.slice(0, 15000)}`;

    const resJson = await this.callGeminiApi(systemPrompt, userPrompt, imageInfo);

    let slides: SlideItem[] = Array.isArray(resJson?.slides) ? resJson.slides : [];

    // Validate and adjust slide count if necessary to strictly satisfy range limits
    if (slides.length < range.min) {
      console.warn(`Generated ${slides.length} slides, below min ${range.min}. Auto-adjusting...`);
      while (slides.length < range.min) {
        const idx = slides.length + 1;
        slides.push({
          position: idx,
          layout: 'title_content',
          title: `Key Insight ${idx}`,
          subtitle: `Important aspect of ${options.topic}`,
          content: {
            bulletPoints: [
              `In-depth analysis of ${options.topic} core factors.`,
              'Strategic implementation recommendations.',
              'Expected measurable outcomes and benefits.',
            ],
          },
          speakerNotes: `Elaborate on key insight ${idx} during presentation.`,
        });
      }
    } else if (slides.length > range.max) {
      console.warn(`Generated ${slides.length} slides, above max ${range.max}. Trimming to ${range.max}...`);
      slides = slides.slice(0, range.max);
    }

    // Ensure positions are sequential 1..N
    slides.forEach((s, index) => {
      s.position = index + 1;
    });

    // Generate AI slide images asynchronously where appropriate
    for (const slide of slides) {
      if (slide.visuals?.image?.prompt && !slide.visuals.image.url) {
        try {
          const imgRes = await CreativeImageService.generateQuoteImage(slide.visuals.image.prompt, { tone: options.tone });
          const b64 = imgRes.png.toString('base64');
          slide.visuals.image.url = `data:image/png;base64,${b64}`;
        } catch (imgErr) {
          console.warn(`Failed to generate slide image for position ${slide.position}:`, imgErr);
        }
      }
    }

    return {
      title: resJson?.title || options.topic || 'Untitled Presentation',
      slides,
    };
  }

  /**
   * Regenerate a single slide with AI
   */
  static async regenerateSlide(slide: SlideItem, context: { topic: string; tone?: string; style?: string; audience?: string }): Promise<SlideItem> {
    const systemPrompt = `You are an expert presentation designer. Regenerate and improve the following slide while maintaining the deck theme.
Respond ONLY with a single JSON object for the slide matching:
{
  "position": ${slide.position},
  "layout": "${slide.layout}",
  "title": "Fresh Engaging Title",
  "subtitle": "Clear Subtitle",
  "content": { "bulletPoints": ["Point 1", "Point 2", "Point 3"] },
  "visuals": { "image": { "prompt": "Image prompt" } },
  "speakerNotes": "Updated speaker notes"
}`;

    const userPrompt = `Topic: ${context.topic}\nCurrent Slide Title: ${slide.title}\nCurrent Content: ${JSON.stringify(slide.content)}`;

    const res = await this.callGeminiApi(systemPrompt, userPrompt);
    return {
      ...slide,
      title: res.title || slide.title,
      subtitle: res.subtitle || slide.subtitle,
      content: res.content || slide.content,
      visuals: res.visuals || slide.visuals,
      speakerNotes: res.speakerNotes || slide.speakerNotes,
    };
  }

  /**
   * Improve complete presentation pass
   */
  static async improvePresentation(slides: SlideItem[], context: { topic: string; tone?: string }): Promise<SlideItem[]> {
    const systemPrompt = `You are a master executive editor. Analyze this slide deck and return an improved version with enhanced clarity, flow, typography balance, grammar, and titles.
Return ONLY valid JSON matching:
{
  "slides": [ /* array of improved slide objects */ ]
}`;

    const userPrompt = `Topic: ${context.topic}\nDeck slides:\n${JSON.stringify(slides)}`;

    const res = await this.callGeminiApi(systemPrompt, userPrompt);
    if (Array.isArray(res?.slides) && res.slides.length === slides.length) {
      return res.slides.map((s: SlideItem, i: number) => ({
        ...slides[i],
        ...s,
        position: i + 1,
      }));
    }
    return slides;
  }
}

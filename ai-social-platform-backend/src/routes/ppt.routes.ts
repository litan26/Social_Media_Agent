import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import pg from 'pg';
import dotenv from 'dotenv';
import { PptGeminiService, SlideItem } from '../services/pptGemini.service.js';
import { PptExportService } from '../services/pptExport.service.js';
import { CreativeImageService } from '../services/creativeImage.service.js';

dotenv.config();

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max upload limit
});

function getPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  const needsSsl = /[?&]sslmode=require/.test(connectionString || '') || process.env.PGSSL === 'true';
  return new pg.Pool({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

const pool = getPool();

/**
 * POST /api/ppt/generate
 * Create presentation from topic prompt or uploaded file (PDF, DOCX, XLSX, TXT, PNG, JPG)
 */
router.post('/generate', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const body = req.body || {};

    let colorTheme = body.colorTheme;
    if (typeof colorTheme === 'string') {
      try {
        colorTheme = JSON.parse(colorTheme);
      } catch (e) {
        colorTheme = undefined;
      }
    }

    const options = {
      topic: body.topic || 'Untitled Presentation',
      lengthCategory: (body.lengthCategory || 'Informative') as 'Short' | 'Informative' | 'Detailed',
      industry: body.industry || 'Business',
      style: body.style || 'Modern',
      colorTheme: colorTheme || {
        name: 'Teal',
        primary: '#0F766E',
        secondary: '#14B8A6',
        accent: '#F59E0B',
        bg: '#F8FAFC',
        text: '#0F172A',
      },
      ratio: body.ratio || '16:9',
      audience: body.audience || 'General Audience',
      tone: body.tone || 'Professional',
      language: body.language || 'English',
      additionalInstructions: body.additionalInstructions || '',
      isLessonPlan: body.isLessonPlan === 'true' || body.isLessonPlan === true,
    };

    const file = req.file;
    const sourceType = file ? file.originalname.split('.').pop()?.toLowerCase() || 'file' : options.isLessonPlan ? 'lesson_plan' : 'topic';

    // 1. Run AI Generation Pipeline
    const generated = await PptGeminiService.generatePresentation(options, file);

    // 2. Persist to Postgres
    const presResult = await pool.query(
      `INSERT INTO presentations 
       (user_id, title, topic, industry, style, color_theme, ratio, audience, tone, language, length_category, additional_instructions, source_type, source_filename, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'ready')
       RETURNING *`,
      [
        userId,
        generated.title,
        options.topic,
        options.industry,
        options.style,
        JSON.stringify(options.colorTheme),
        options.ratio,
        options.audience,
        options.tone,
        options.language,
        options.lengthCategory,
        options.additionalInstructions,
        sourceType,
        file?.originalname || null,
      ]
    );

    const presentation = presResult.rows[0];

    // 3. Persist generated slides
    const slideRows: SlideItem[] = [];
    for (let i = 0; i < generated.slides.length; i++) {
      const s = generated.slides[i];
      const slideRes = await pool.query(
        `INSERT INTO presentation_slides 
         (presentation_id, position, layout, title, subtitle, content, visuals, speaker_notes, styling)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          presentation.id,
          s.position || i + 1,
          s.layout || 'title_content',
          s.title || '',
          s.subtitle || '',
          JSON.stringify(s.content || {}),
          JSON.stringify(s.visuals || {}),
          s.speakerNotes || '',
          JSON.stringify(s.styling || {}),
        ]
      );
      slideRows.push(slideRes.rows[0]);
    }

    res.json({
      success: true,
      presentation,
      slides: slideRows,
    });
  } catch (err: any) {
    console.error('Error generating presentation:', err);
    res.status(500).json({ error: err.message || 'Failed to generate presentation' });
  }
});

/**
 * GET /api/ppt/list
 * Get history of user presentations
 */
router.get('/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await pool.query(
      `SELECT p.*, COUNT(s.id)::int as slide_count 
       FROM presentations p
       LEFT JOIN presentation_slides s ON p.id = s.presentation_id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [userId]
    );
    res.json({ presentations: result.rows });
  } catch (err: any) {
    console.error('Error listing presentations:', err);
    res.status(500).json({ error: 'Failed to fetch presentations' });
  }
});

/**
 * GET /api/ppt/:id
 * Fetch single presentation with all slides
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const presentationId = parseInt(String(req.params.id), 10);

    const presRes = await pool.query(`SELECT * FROM presentations WHERE id = $1 AND user_id = $2`, [presentationId, userId]);
    if (presRes.rows.length === 0) {
      return res.status(404).json({ error: 'Presentation not found' });
    }

    const slidesRes = await pool.query(`SELECT * FROM presentation_slides WHERE presentation_id = $1 ORDER BY position ASC`, [presentationId]);

    res.json({
      presentation: presRes.rows[0],
      slides: slidesRes.rows,
    });
  } catch (err: any) {
    console.error('Error fetching presentation:', err);
    res.status(500).json({ error: 'Failed to fetch presentation details' });
  }
});

/**
 * PUT /api/ppt/:id
 * Save edits, reorder slides, or update metadata
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const presentationId = parseInt(String(req.params.id), 10);
    const { title, colorTheme, ratio, slides } = req.body;

    const presRes = await pool.query(`SELECT * FROM presentations WHERE id = $1 AND user_id = $2`, [presentationId, userId]);
    if (presRes.rows.length === 0) {
      return res.status(404).json({ error: 'Presentation not found' });
    }

    // Update metadata if provided
    if (title || colorTheme || ratio) {
      await pool.query(
        `UPDATE presentations SET 
         title = COALESCE($1, title),
         color_theme = COALESCE($2, color_theme),
         ratio = COALESCE($3, ratio),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [title || null, colorTheme ? JSON.stringify(colorTheme) : null, ratio || null, presentationId]
      );
    }

    // Update slides if provided
    if (Array.isArray(slides)) {
      // Clear old slides and re-insert updated array to preserve position order
      await pool.query(`DELETE FROM presentation_slides WHERE presentation_id = $1`, [presentationId]);
      
      const updatedSlideRows = [];
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const sRes = await pool.query(
          `INSERT INTO presentation_slides 
           (presentation_id, position, layout, title, subtitle, content, visuals, speaker_notes, styling)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            presentationId,
            i + 1,
            s.layout || 'title_content',
            s.title || '',
            s.subtitle || '',
            JSON.stringify(s.content || {}),
            JSON.stringify(s.visuals || {}),
            s.speaker_notes || s.speakerNotes || '',
            JSON.stringify(s.styling || {}),
          ]
        );
        updatedSlideRows.push(sRes.rows[0]);
      }
      return res.json({ success: true, slides: updatedSlideRows });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error updating presentation:', err);
    res.status(500).json({ error: 'Failed to save presentation updates' });
  }
});

/**
 * DELETE /api/ppt/:id
 * Delete presentation
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const presentationId = parseInt(String(req.params.id), 10);
    await pool.query(`DELETE FROM presentations WHERE id = $1 AND user_id = $2`, [presentationId, userId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting presentation:', err);
    res.status(500).json({ error: 'Failed to delete presentation' });
  }
});

/**
 * POST /api/ppt/:id/duplicate
 * Duplicate presentation
 */
router.post('/:id/duplicate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const presentationId = parseInt(String(req.params.id), 10);

    const presRes = await pool.query(`SELECT * FROM presentations WHERE id = $1 AND user_id = $2`, [presentationId, userId]);
    if (presRes.rows.length === 0) {
      return res.status(404).json({ error: 'Presentation not found' });
    }

    const original = presRes.rows[0];

    const dupPres = await pool.query(
      `INSERT INTO presentations 
       (user_id, title, topic, industry, style, color_theme, ratio, audience, tone, language, length_category, additional_instructions, source_type, source_filename, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'ready')
       RETURNING *`,
      [
        userId,
        `${original.title} (Copy)`,
        original.topic,
        original.industry,
        original.style,
        JSON.stringify(original.color_theme),
        original.ratio,
        original.audience,
        original.tone,
        original.language,
        original.length_category,
        original.additional_instructions,
        original.source_type,
        original.source_filename,
      ]
    );

    const slidesRes = await pool.query(`SELECT * FROM presentation_slides WHERE presentation_id = $1 ORDER BY position ASC`, [presentationId]);
    for (const s of slidesRes.rows) {
      await pool.query(
        `INSERT INTO presentation_slides 
         (presentation_id, position, layout, title, subtitle, content, visuals, speaker_notes, styling)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [dupPres.rows[0].id, s.position, s.layout, s.title, s.subtitle, JSON.stringify(s.content), JSON.stringify(s.visuals), s.speaker_notes, JSON.stringify(s.styling)]
      );
    }

    res.json({ success: true, presentation: dupPres.rows[0] });
  } catch (err: any) {
    console.error('Error duplicating presentation:', err);
    res.status(500).json({ error: 'Failed to duplicate presentation' });
  }
});

/**
 * POST /api/ppt/:id/regenerate-slide
 * Regenerate a specific slide
 */
router.post('/:id/regenerate-slide', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const presentationId = parseInt(String(req.params.id), 10);
    const { slide } = req.body;

    const presRes = await pool.query(`SELECT * FROM presentations WHERE id = $1 AND user_id = $2`, [presentationId, userId]);
    if (presRes.rows.length === 0) return res.status(404).json({ error: 'Presentation not found' });

    const pres = presRes.rows[0];
    const regenerated = await PptGeminiService.regenerateSlide(slide, {
      topic: pres.topic || pres.title,
      tone: pres.tone,
      style: pres.style,
      audience: pres.audience,
    });

    res.json({ success: true, slide: regenerated });
  } catch (err: any) {
    console.error('Error regenerating slide:', err);
    res.status(500).json({ error: 'Failed to regenerate slide' });
  }
});

/**
 * POST /api/ppt/:id/generate-image
 * AI Image replacement for slide
 */
router.post('/:id/generate-image', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, tone } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const imgRes = await CreativeImageService.generateQuoteImage(prompt, { tone: tone || 'professional' });
    const b64 = imgRes.png.toString('base64');
    const dataUrl = `data:image/png;base64,${b64}`;

    res.json({ success: true, url: dataUrl });
  } catch (err: any) {
    console.error('Error generating slide image:', err);
    res.status(500).json({ error: 'Failed to generate slide image' });
  }
});

/**
 * POST /api/ppt/:id/improve
 * AI presentation improvement pass
 */
router.post('/:id/improve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const presentationId = parseInt(String(req.params.id), 10);

    const presRes = await pool.query(`SELECT * FROM presentations WHERE id = $1 AND user_id = $2`, [presentationId, userId]);
    if (presRes.rows.length === 0) return res.status(404).json({ error: 'Presentation not found' });

    const slidesRes = await pool.query(`SELECT * FROM presentation_slides WHERE presentation_id = $1 ORDER BY position ASC`, [presentationId]);
    const improvedSlides = await PptGeminiService.improvePresentation(slidesRes.rows, {
      topic: presRes.rows[0].topic || presRes.rows[0].title,
      tone: presRes.rows[0].tone,
    });

    res.json({ success: true, slides: improvedSlides });
  } catch (err: any) {
    console.error('Error improving presentation:', err);
    res.status(500).json({ error: 'Failed to improve presentation' });
  }
});

/**
 * GET /api/ppt/:id/export/pptx
 * Export native PowerPoint presentation file
 */
router.get('/:id/export/pptx', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const presentationId = parseInt(String(req.params.id), 10);

    const presRes = await pool.query(`SELECT * FROM presentations WHERE id = $1 AND user_id = $2`, [presentationId, userId]);
    if (presRes.rows.length === 0) return res.status(404).json({ error: 'Presentation not found' });

    const slidesRes = await pool.query(`SELECT * FROM presentation_slides WHERE presentation_id = $1 ORDER BY position ASC`, [presentationId]);

    const presentation = presRes.rows[0];
    const pptxBuffer = await PptExportService.buildPptxBuffer(presentation.title, slidesRes.rows, {
      colorTheme: typeof presentation.color_theme === 'string' ? JSON.parse(presentation.color_theme) : presentation.color_theme,
      ratio: presentation.ratio,
    });

    const safeFilename = presentation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.pptx"`);
    res.send(pptxBuffer);
  } catch (err: any) {
    console.error('Error exporting PPTX:', err);
    res.status(500).json({ error: 'Failed to export PPTX file' });
  }
});

export default router;

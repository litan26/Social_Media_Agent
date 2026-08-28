import pptxgen from 'pptxgenjs';
const PptxGenJS: any = (pptxgen as any).default || pptxgen;
import { ColorTheme, SlideItem } from './pptGemini.service.js';

export class PptExportService {
  static async buildPptxBuffer(
    title: string,
    slides: SlideItem[],
    options: {
      colorTheme?: ColorTheme;
      ratio?: string;
    } = {}
  ): Promise<Buffer> {
    const pptx = new PptxGenJS();
    
    // Set presentation layout ratio
    if (options.ratio === '4:3') {
      pptx.layout = 'LAYOUT_4x3';
    } else if (options.ratio === '16:10') {
      pptx.layout = 'LAYOUT_16x10';
    } else {
      pptx.layout = 'LAYOUT_16x9';
    }

    const theme = options.colorTheme || {
      name: 'Teal',
      primary: '#0F766E',
      secondary: '#14B8A6',
      accent: '#F59E0B',
      bg: '#F8FAFC',
      text: '#0F172A',
    };

    // Helper hex stripper
    const cleanHex = (hex?: string, fallback: string = '000000'): string => {
      if (!hex) return fallback.replace('#', '');
      return hex.replace('#', '').trim();
    };

    const primaryColor = cleanHex(theme.primary, '0F766E');
    const secondaryColor = cleanHex(theme.secondary, '14B8A6');
    const accentColor = cleanHex(theme.accent, 'F59E0B');
    const bgColor = cleanHex(theme.bg, 'F8FAFC');
    const textColor = cleanHex(theme.text, '0F172A');

    for (const slideData of slides) {
      const slide = pptx.addSlide();
      
      // Set background color
      slide.background = { color: bgColor };

      // Set speaker notes if available
      if (slideData.speakerNotes) {
        slide.addNotes(slideData.speakerNotes);
      }

      // Render based on slide layout
      if (slideData.layout === 'title') {
        // Title Slide Header shape accent
        slide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: '100%',
          h: 0.25,
          fill: { color: primaryColor },
        });

        slide.addText(slideData.title || title, {
          x: 1.0,
          y: 2.2,
          w: 11.3,
          h: 1.5,
          fontSize: 40,
          bold: true,
          color: primaryColor,
          align: 'center',
          fontFace: 'Arial',
        });

        if (slideData.subtitle) {
          slide.addText(slideData.subtitle, {
            x: 1.5,
            y: 3.8,
            w: 10.3,
            h: 1.0,
            fontSize: 22,
            color: secondaryColor,
            align: 'center',
            fontFace: 'Arial',
          });
        }
      } else if (slideData.layout === 'thank_you') {
        slide.addText(slideData.title || 'Thank You!', {
          x: 1.0,
          y: 2.5,
          w: 11.3,
          h: 1.5,
          fontSize: 44,
          bold: true,
          color: primaryColor,
          align: 'center',
          fontFace: 'Arial',
        });

        if (slideData.subtitle) {
          slide.addText(slideData.subtitle, {
            x: 1.5,
            y: 4.2,
            w: 10.3,
            h: 1.0,
            fontSize: 20,
            color: secondaryColor,
            align: 'center',
            fontFace: 'Arial',
          });
        }
      } else {
        // Standard Content Slide Header
        slide.addText(slideData.title || 'Slide Title', {
          x: 0.8,
          y: 0.6,
          w: 11.7,
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: primaryColor,
          fontFace: 'Arial',
        });

        if (slideData.subtitle) {
          slide.addText(slideData.subtitle, {
            x: 0.8,
            y: 1.3,
            w: 11.7,
            h: 0.5,
            fontSize: 16,
            color: secondaryColor,
            fontFace: 'Arial',
          });
        }

        const startY = slideData.subtitle ? 1.9 : 1.5;

        // Render Bullet Points if present
        if (slideData.content?.bulletPoints && slideData.content.bulletPoints.length > 0) {
          const bulletTextObjects = slideData.content.bulletPoints.map((pt) => ({
            text: pt,
            options: { bullet: true, color: textColor, fontSize: 16, breakLine: true, fontFace: 'Arial' },
          }));

          slide.addText(bulletTextObjects, {
            x: 0.8,
            y: startY,
            w: slideData.visuals?.image?.url ? 6.0 : 11.5,
            h: 4.8,
            lineSpacing: 24,
          });
        } else if (slideData.content?.paragraphs && slideData.content.paragraphs.length > 0) {
          slide.addText(slideData.content.paragraphs.join('\n\n'), {
            x: 0.8,
            y: startY,
            w: slideData.visuals?.image?.url ? 6.0 : 11.5,
            h: 4.8,
            fontSize: 16,
            color: textColor,
            fontFace: 'Arial',
          });
        }

        // Render Image if available
        if (slideData.visuals?.image?.url) {
          try {
            slide.addImage({
              data: slideData.visuals.image.url,
              x: 7.2,
              y: startY,
              w: 5.2,
              h: 4.5,
              sizing: { type: 'contain', w: 5.2, h: 4.5 },
            });
          } catch (imgErr) {
            console.warn('Failed to embed slide image in PPTX export:', imgErr);
          }
        }

        // Render Table if available
        if (slideData.visuals?.table && slideData.visuals.table.headers) {
          const tableRows: any[][] = [];
          
          // Header row
          tableRows.push(
            slideData.visuals.table.headers.map((h) => ({
              text: h,
              options: { bold: true, fill: primaryColor, color: 'FFFFFF', fontSize: 14 },
            }))
          );

          // Data rows
          if (Array.isArray(slideData.visuals.table.rows)) {
            slideData.visuals.table.rows.forEach((row) => {
              tableRows.push(
                row.map((cell) => ({
                  text: cell,
                  options: { color: textColor, fontSize: 12 },
                }))
              );
            });
          }

          slide.addTable(tableRows, {
            x: 0.8,
            y: startY + 0.5,
            w: 11.5,
            colW: Array(slideData.visuals.table.headers.length).fill(11.5 / slideData.visuals.table.headers.length),
            border: { pt: 1, color: 'CBD5E1' },
          });
        }

        // Render Key Metrics / Stats Cards if present
        if (slideData.content?.keyMetrics && slideData.content.keyMetrics.length > 0) {
          const metrics = slideData.content.keyMetrics;
          const cardW = Math.min(3.5, 11.5 / metrics.length - 0.2);
          metrics.forEach((m, idx) => {
            const posX = 0.8 + idx * (cardW + 0.3);
            slide.addShape(pptx.ShapeType.roundRect, {
              x: posX,
              y: 4.5,
              w: cardW,
              h: 1.8,
              fill: { color: 'FFFFFF' },
              line: { color: primaryColor, width: 1.5 },
            });

            slide.addText(m.value, {
              x: posX,
              y: 4.7,
              w: cardW,
              h: 0.7,
              fontSize: 26,
              bold: true,
              color: primaryColor,
              align: 'center',
            });

            slide.addText(m.label, {
              x: posX,
              y: 5.4,
              w: cardW,
              h: 0.5,
              fontSize: 14,
              color: textColor,
              align: 'center',
            });
          });
        }
      }

      // Footer Slide number
      slide.addText(`Slide ${slideData.position}`, {
        x: 11.0,
        y: 7.0,
        w: 2.0,
        h: 0.4,
        fontSize: 10,
        color: '94A3B8',
        align: 'right',
      });
    }

    const output = await pptx.write({ outputType: 'nodebuffer' });
    return output as Buffer;
  }
}

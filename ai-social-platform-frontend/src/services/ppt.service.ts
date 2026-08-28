import { api } from './api';
import type { GenerateParams, Presentation, SlideItem } from '../types/presentationTypes';

export class PptService {
  /**
   * Generate presentation via backend AI pipeline
   */
  static async generatePresentation(params: GenerateParams): Promise<{ presentation: Presentation; slides: SlideItem[] }> {
    const formData = new FormData();
    formData.append('topic', params.topic);
    formData.append('lengthCategory', params.lengthCategory);
    formData.append('industry', params.industry);
    formData.append('style', params.style);
    formData.append('colorTheme', JSON.stringify(params.colorTheme));
    formData.append('ratio', params.ratio);
    formData.append('audience', params.audience);
    formData.append('tone', params.tone);
    formData.append('language', params.language);
    if (params.additionalInstructions) {
      formData.append('additionalInstructions', params.additionalInstructions);
    }
    if (params.isLessonPlan) {
      formData.append('isLessonPlan', 'true');
    }
    if (params.file) {
      formData.append('file', params.file);
    }

    const res = await api.post('/ppt/generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  /**
   * List history of presentations
   */
  static async listPresentations(): Promise<Presentation[]> {
    const res = await api.get('/ppt/list');
    return res.data.presentations;
  }

  /**
   * Get single presentation with slides
   */
  static async getPresentation(id: number): Promise<{ presentation: Presentation; slides: SlideItem[] }> {
    const res = await api.get(`/ppt/${id}`);
    return res.data;
  }

  /**
   * Save presentation updates (edits, reordering, title, theme, ratio)
   */
  static async updatePresentation(
    id: number,
    data: { title?: string; colorTheme?: any; ratio?: string; slides?: SlideItem[] }
  ): Promise<{ success: boolean; slides?: SlideItem[] }> {
    const res = await api.put(`/ppt/${id}`, data);
    return res.data;
  }

  /**
   * Delete presentation
   */
  static async deletePresentation(id: number): Promise<boolean> {
    const res = await api.delete(`/ppt/${id}`);
    return res.data.success;
  }

  /**
   * Duplicate presentation
   */
  static async duplicatePresentation(id: number): Promise<{ presentation: Presentation }> {
    const res = await api.post(`/ppt/${id}/duplicate`);
    return res.data;
  }

  /**
   * Regenerate single slide with AI
   */
  static async regenerateSlide(id: number, slide: SlideItem): Promise<{ slide: SlideItem }> {
    const res = await api.post(`/ppt/${id}/regenerate-slide`, { slide });
    return res.data;
  }

  /**
   * AI Image replacement for slide
   */
  static async generateSlideImage(id: number, prompt: string, tone?: string): Promise<{ url: string }> {
    const res = await api.post(`/ppt/${id}/generate-image`, { prompt, tone });
    return res.data;
  }

  /**
   * Improve entire presentation pass
   */
  static async improvePresentation(id: number): Promise<{ slides: SlideItem[] }> {
    const res = await api.post(`/ppt/${id}/improve`);
    return res.data;
  }

  /**
   * Download PPTX export URL
   */
  static getPptxExportUrl(id: number): string {
    const token = localStorage.getItem('token');
    return `/api/ppt/${id}/export/pptx?token=${token}`;
  }
}

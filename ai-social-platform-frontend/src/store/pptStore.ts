import { create } from 'zustand';
import type { ColorTheme, GenerateParams, Presentation, SlideItem, SlideLayoutType } from '../types/presentationTypes';
import { PptService } from '../services/ppt.service';

export interface PPTState {
  // Wizard State
  wizardStep: number;
  creationParams: GenerateParams;
  setCreationParams: (params: Partial<GenerateParams>) => void;
  setWizardStep: (step: number) => void;

  // Active Presentation
  activePresentation: Presentation | null;
  slides: SlideItem[];
  activeSlideIndex: number;

  // State flags
  isGenerating: boolean;
  generationProgressText: string;
  generationStep: number; // 0 to 5
  isSaving: boolean;
  isImproving: boolean;
  error: string | null;

  // History / Undo Stack
  history: SlideItem[][];
  historyIndex: number;

  // Modals
  isExportModalOpen: boolean;
  isQualityCheckOpen: boolean;
  setExportModalOpen: (open: boolean) => void;
  setQualityCheckOpen: (open: boolean) => void;

  // Actions
  generatePresentation: () => Promise<number | null>;
  loadPresentation: (id: number) => Promise<void>;
  savePresentation: () => Promise<void>;
  setActiveSlideIndex: (index: number) => void;

  // Slide Modifications
  updateSlideContent: (index: number, updatedSlide: Partial<SlideItem>) => void;
  addSlide: (layout?: SlideLayoutType) => void;
  deleteSlide: (index: number) => void;
  duplicateSlide: (index: number) => void;
  reorderSlides: (startIndex: number, endIndex: number) => void;
  regenerateActiveSlide: () => Promise<void>;
  generateImageForSlide: (index: number, prompt: string) => Promise<void>;
  improveDeckWithAI: () => Promise<void>;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
}

const defaultTheme: ColorTheme = {
  name: 'Teal',
  primary: '#0F766E',
  secondary: '#14B8A6',
  accent: '#F59E0B',
  bg: '#F8FAFC',
  text: '#0F172A',
};

const initialCreationParams: GenerateParams = {
  topic: '',
  lengthCategory: 'Informative',
  industry: 'Business',
  style: 'Modern',
  colorTheme: defaultTheme,
  ratio: '16:9',
  audience: 'General Audience',
  tone: 'Professional',
  language: 'English',
  additionalInstructions: '',
  isLessonPlan: false,
};

export const usePPTStore = create<PPTState>((set, get) => ({
  wizardStep: 1,
  creationParams: initialCreationParams,
  setCreationParams: (params) =>
    set((state) => ({
      creationParams: { ...state.creationParams, ...params },
    })),
  setWizardStep: (step) => set({ wizardStep: step }),

  activePresentation: null,
  slides: [],
  activeSlideIndex: 0,

  isGenerating: false,
  generationProgressText: '',
  generationStep: 0,
  isSaving: false,
  isImproving: false,
  error: null,

  history: [],
  historyIndex: -1,

  isExportModalOpen: false,
  isQualityCheckOpen: false,
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setQualityCheckOpen: (open) => set({ isQualityCheckOpen: open }),

  setActiveSlideIndex: (index) => set({ activeSlideIndex: index }),

  generatePresentation: async () => {
    const { creationParams } = get();
    if (!creationParams.topic && !creationParams.file) {
      set({ error: 'Please enter a topic or upload a file.' });
      return null;
    }

    set({
      isGenerating: true,
      error: null,
      generationStep: 0,
      generationProgressText: 'Analyzing your content and topic...',
    });

    try {
      // Simulate stepped progress UI feedback
      const steps = [
        'Analyzing your content...',
        'Creating presentation outline...',
        'Writing slide content...',
        'Designing slides & layout...',
        'Generating visuals & images...',
        'Finalizing presentation...',
      ];

      for (let i = 0; i < steps.length; i++) {
        set({ generationStep: i, generationProgressText: steps[i] });
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      const res = await PptService.generatePresentation(creationParams);
      
      set({
        activePresentation: res.presentation,
        slides: res.slides,
        activeSlideIndex: 0,
        isGenerating: false,
        history: [res.slides],
        historyIndex: 0,
      });

      return res.presentation.id;
    } catch (err: any) {
      console.error('Failed to generate presentation:', err);
      set({
        isGenerating: false,
        error: err.response?.data?.error || err.message || 'Failed to generate presentation.',
      });
      return null;
    }
  },

  loadPresentation: async (id: number) => {
    set({ isSaving: true, error: null });
    try {
      const res = await PptService.getPresentation(id);
      set({
        activePresentation: res.presentation,
        slides: res.slides,
        activeSlideIndex: 0,
        isSaving: false,
        history: [res.slides],
        historyIndex: 0,
      });
    } catch (err: any) {
      console.error('Failed to load presentation:', err);
      set({ isSaving: false, error: 'Failed to load presentation details.' });
    }
  },

  savePresentation: async () => {
    const { activePresentation, slides } = get();
    if (!activePresentation) return;

    set({ isSaving: true });
    try {
      await PptService.updatePresentation(activePresentation.id, {
        title: activePresentation.title,
        colorTheme: activePresentation.color_theme,
        ratio: activePresentation.ratio,
        slides,
      });
      set({ isSaving: false });
    } catch (err: any) {
      console.error('Failed to save presentation:', err);
      set({ isSaving: false, error: 'Failed to save presentation changes.' });
    }
  },

  updateSlideContent: (index, updatedFields) => {
    const { slides, history, historyIndex } = get();
    const updatedSlides = [...slides];
    updatedSlides[index] = {
      ...updatedSlides[index],
      ...updatedFields,
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updatedSlides);

    set({
      slides: updatedSlides,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  addSlide: (layout = 'title_content') => {
    const { slides, activeSlideIndex, history, historyIndex } = get();
    const newSlide: SlideItem = {
      position: slides.length + 1,
      layout,
      title: 'New Slide Title',
      subtitle: 'Subtitle text',
      content: {
        bulletPoints: ['First key point', 'Second key point', 'Third key point'],
      },
      speakerNotes: '',
    };

    const updatedSlides = [...slides];
    updatedSlides.splice(activeSlideIndex + 1, 0, newSlide);

    // Re-index position numbers
    updatedSlides.forEach((s, idx) => (s.position = idx + 1));

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updatedSlides);

    set({
      slides: updatedSlides,
      activeSlideIndex: activeSlideIndex + 1,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  deleteSlide: (index) => {
    const { slides, activeSlideIndex, history, historyIndex } = get();
    if (slides.length <= 1) return;

    const updatedSlides = slides.filter((_, i) => i !== index);
    updatedSlides.forEach((s, idx) => (s.position = idx + 1));

    const newActive = Math.min(activeSlideIndex, updatedSlides.length - 1);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updatedSlides);

    set({
      slides: updatedSlides,
      activeSlideIndex: newActive,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  duplicateSlide: (index) => {
    const { slides, history, historyIndex } = get();
    const target = slides[index];
    const duplicated: SlideItem = {
      ...JSON.parse(JSON.stringify(target)),
      position: index + 2,
    };

    const updatedSlides = [...slides];
    updatedSlides.splice(index + 1, 0, duplicated);
    updatedSlides.forEach((s, idx) => (s.position = idx + 1));

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updatedSlides);

    set({
      slides: updatedSlides,
      activeSlideIndex: index + 1,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  reorderSlides: (startIndex, endIndex) => {
    const { slides, history, historyIndex } = get();
    const result = Array.from(slides);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    result.forEach((s, idx) => (s.position = idx + 1));

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(result);

    set({
      slides: result,
      activeSlideIndex: endIndex,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  regenerateActiveSlide: async () => {
    const { activePresentation, slides, activeSlideIndex } = get();
    if (!activePresentation || !slides[activeSlideIndex]) return;

    set({ isSaving: true });
    try {
      const current = slides[activeSlideIndex];
      const res = await PptService.regenerateSlide(activePresentation.id, current);
      
      const updatedSlides = [...slides];
      updatedSlides[activeSlideIndex] = res.slide;

      set({
        slides: updatedSlides,
        isSaving: false,
      });
    } catch (err: any) {
      console.error('Failed to regenerate slide:', err);
      set({ isSaving: false, error: 'Failed to regenerate slide.' });
    }
  },

  generateImageForSlide: async (index, prompt) => {
    const { activePresentation, slides } = get();
    if (!activePresentation || !slides[index]) return;

    set({ isSaving: true });
    try {
      const res = await PptService.generateSlideImage(activePresentation.id, prompt, activePresentation.tone);
      const updatedSlides = [...slides];
      const target = updatedSlides[index];
      
      target.visuals = {
        ...target.visuals,
        image: {
          url: res.url,
          prompt,
          alt: prompt,
        },
      };

      set({ slides: updatedSlides, isSaving: false });
    } catch (err: any) {
      console.error('Failed to generate slide image:', err);
      set({ isSaving: false, error: 'Failed to generate slide image.' });
    }
  },

  improveDeckWithAI: async () => {
    const { activePresentation } = get();
    if (!activePresentation) return;

    set({ isImproving: true });
    try {
      const res = await PptService.improvePresentation(activePresentation.id);
      set({
        slides: res.slides,
        isImproving: false,
      });
    } catch (err: any) {
      console.error('Failed to improve presentation:', err);
      set({ isImproving: false, error: 'Failed to run AI improvement pass.' });
    }
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        slides: history[historyIndex - 1],
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        slides: history[historyIndex + 1],
        historyIndex: historyIndex + 1,
      });
    }
  },
}));

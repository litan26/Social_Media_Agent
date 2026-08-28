import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePPTStore } from '../../store/pptStore';
import { SlideToolbar } from '../../components/ppt-maker/SlideToolbar';
import { SlideSidebar } from '../../components/ppt-maker/SlideSidebar';
import { SlideCanvas } from '../../components/ppt-maker/SlideCanvas';
import { QualityCheckModal } from '../../components/ppt-maker/QualityCheckModal';
import { ExportModal } from '../../components/ppt-maker/ExportModal';

export const PPTEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    activePresentation,
    slides,
    activeSlideIndex,
    loadPresentation,
    updateSlideContent,
    error,
  } = usePPTStore();

  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (id) {
      loadPresentation(parseInt(id, 10));
    }
  }, [id]);

  if (!activePresentation || slides.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100 p-6">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Loading Presentation Studio...</p>
        </div>
      </div>
    );
  }

  const currentSlide = slides[activeSlideIndex] || slides[0];
  const theme =
    typeof activePresentation.color_theme === 'string'
      ? JSON.parse(activePresentation.color_theme)
      : activePresentation.color_theme;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Toolbar */}
      <SlideToolbar onToggleNotes={() => setShowNotes(!showNotes)} showNotes={showNotes} />

      {error && (
        <div className="bg-red-500/20 px-6 py-2 text-xs font-semibold text-red-300 border-b border-red-500/30">
          ⚠️ {error}
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Drag-and-Drop Slide Thumbnails Sidebar */}
        <SlideSidebar />

        {/* Center Main Slide Canvas Workspace */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-8 flex items-center justify-center">
          {currentSlide && <SlideCanvas slide={currentSlide} theme={theme} ratio={activePresentation.ratio} />}
        </main>
      </div>

      {/* Bottom Speaker Notes Drawer */}
      {showNotes && currentSlide && (
        <div className="border-t border-white/10 bg-slate-900/90 p-4 backdrop-blur-xl">
          <div className="mx-auto max-w-4xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-300">Presenter Speaker Notes</span>
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>
            <textarea
              rows={3}
              value={currentSlide.speakerNotes || currentSlide.speaker_notes || ''}
              onChange={(e) => updateSlideContent(activeSlideIndex, { speakerNotes: e.target.value })}
              placeholder="Add presenter notes for this slide..."
              className="w-full resize-none rounded-xl border border-white/10 bg-slate-800/80 p-3 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <QualityCheckModal />
      <ExportModal />
    </div>
  );
};

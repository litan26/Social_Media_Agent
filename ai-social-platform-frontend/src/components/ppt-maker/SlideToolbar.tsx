import React from 'react';
import { usePPTStore } from '../../store/pptStore';
import type { SlideLayoutType } from '../../types/presentationTypes';

const LAYOUT_OPTIONS: Array<{ id: SlideLayoutType; label: string }> = [
  { id: 'title', label: 'Title Slide' },
  { id: 'title_content', label: 'Title + Content' },
  { id: 'two_column', label: 'Two Column' },
  { id: 'image_text', label: 'Image + Text' },
  { id: 'stats', label: 'Statistics Cards' },
  { id: 'chart', label: 'Chart Visual' },
  { id: 'table', label: 'Data Table' },
  { id: 'timeline', label: 'Timeline Steps' },
  { id: 'process', label: 'Process Steps' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'quote', label: 'Quote Card' },
  { id: 'section_divider', label: 'Section Divider' },
  { id: 'thank_you', label: 'Thank You' },
];

interface SlideToolbarProps {
  onToggleNotes: () => void;
  showNotes: boolean;
}

export const SlideToolbar: React.FC<SlideToolbarProps> = ({ onToggleNotes, showNotes }) => {
  const {
    activePresentation,
    slides,
    activeSlideIndex,
    updateSlideContent,
    regenerateActiveSlide,
    improveDeckWithAI,
    isImproving,
    setExportModalOpen,
    setQualityCheckOpen,
    savePresentation,
    isSaving,
    undo,
    redo,
  } = usePPTStore();

  const currentSlide = slides[activeSlideIndex];

  const handleLayoutChange = (newLayout: SlideLayoutType) => {
    updateSlideContent(activeSlideIndex, { layout: newLayout });
  };

  return (
    <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-slate-900/80 px-6 py-3 backdrop-blur-xl">
      {/* Left: Presentation Title & Layout Selector */}
      <div className="flex items-center space-x-4">
        <input
          type="text"
          value={activePresentation?.title || 'Untitled Presentation'}
          onChange={(e) => {
            if (activePresentation) {
              usePPTStore.setState({
                activePresentation: { ...activePresentation, title: e.target.value },
              });
            }
          }}
          className="bg-transparent text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-violet-500 rounded px-2 py-1"
        />

        <div className="h-4 w-px bg-white/10" />

        {/* Layout Switcher Dropdown */}
        {currentSlide && (
          <select
            value={currentSlide.layout}
            onChange={(e) => handleLayoutChange(e.target.value as SlideLayoutType)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 focus:border-violet-500 focus:outline-none"
          >
            {LAYOUT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Center: Slide Actions & Undo/Redo */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={undo}
          title="Undo"
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-xs text-slate-300 hover:bg-white/10"
        >
          ↩️
        </button>
        <button
          type="button"
          onClick={redo}
          title="Redo"
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-xs text-slate-300 hover:bg-white/10"
        >
          ↪️
        </button>

        <div className="h-4 w-px bg-white/10" />

        <button
          type="button"
          onClick={() => regenerateActiveSlide()}
          className="flex items-center space-x-1.5 rounded-lg border border-violet-500/30 bg-violet-600/20 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/30"
        >
          <span>✨ Regenerate Slide</span>
        </button>

        <button
          type="button"
          onClick={() => improveDeckWithAI()}
          disabled={isImproving}
          className="flex items-center space-x-1.5 rounded-lg border border-fuchsia-500/30 bg-fuchsia-600/20 px-3 py-1.5 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-600/30 disabled:opacity-50"
        >
          <span>{isImproving ? 'Improving Deck...' : '✨ Improve Deck'}</span>
        </button>
      </div>

      {/* Right: Notes, Quality Check, Save & Export */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleNotes}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
            showNotes ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
          }`}
        >
          📝 Notes
        </button>

        <button
          type="button"
          onClick={() => setQualityCheckOpen(true)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
        >
          🔍 Quality Check
        </button>

        <button
          type="button"
          onClick={() => savePresentation()}
          disabled={isSaving}
          className="rounded-lg border border-emerald-500/30 bg-emerald-600/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30"
        >
          {isSaving ? 'Saving...' : '💾 Save'}
        </button>

        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-fuchsia-500"
        >
          🚀 Export Presentation
        </button>
      </div>
    </div>
  );
};

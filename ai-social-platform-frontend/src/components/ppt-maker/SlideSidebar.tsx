import React from 'react';
import { usePPTStore } from '../../store/pptStore';

export const SlideSidebar: React.FC = () => {
  const { slides, activeSlideIndex, setActiveSlideIndex, addSlide, deleteSlide, duplicateSlide, reorderSlides } = usePPTStore();
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderSlides(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  return (
    <aside className="flex w-64 flex-col border-r border-white/10 bg-slate-900/60 backdrop-blur-xl">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Slides ({slides.length})</h3>
        <button
          type="button"
          onClick={() => addSlide('title_content')}
          className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white shadow-md hover:bg-violet-500"
        >
          + Add Slide
        </button>
      </div>

      {/* Slide Thumbnails List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {slides.map((s, idx) => {
          const isActive = idx === activeSlideIndex;
          return (
            <div
              key={s.id || idx}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              onClick={() => setActiveSlideIndex(idx)}
              className={`group relative flex cursor-pointer flex-col rounded-xl border p-2.5 transition-all ${
                isActive
                  ? 'border-violet-500 bg-violet-600/20 shadow-lg shadow-violet-500/10 ring-2 ring-violet-500/50'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-slate-400">#{s.position}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">{s.layout.replace('_', ' ')}</span>
              </div>

              <p className="mt-1.5 truncate text-xs font-bold text-slate-200">{s.title || 'Untitled Slide'}</p>

              {/* Action buttons on hover */}
              <div className="mt-2 flex items-center justify-end space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  title="Duplicate Slide"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateSlide(idx);
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  📋
                </button>
                {slides.length > 1 && (
                  <button
                    type="button"
                    title="Delete Slide"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSlide(idx);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

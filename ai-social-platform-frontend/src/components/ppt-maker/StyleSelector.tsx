import React from 'react';

export const STYLE_CATEGORIES = [
  'Minimalist',
  'Simple',
  'Aesthetic',
  'Cute',
  'Professional',
  'Vintage',
  'Modern',
  'Creative',
  'Corporate',
  'Elegant',
  'Bold',
  'Academic',
  'Editorial',
  'Futuristic',
];

interface StyleSelectorProps {
  selectedStyle: string;
  onSelect: (style: string) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onSelect }) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-300">Visual Style</label>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {STYLE_CATEGORIES.map((style) => {
          const isSelected = selectedStyle === style;
          return (
            <button
              key={style}
              type="button"
              onClick={() => onSelect(style)}
              className={`rounded-xl border px-3 py-2.5 text-center text-xs font-semibold transition-all ${
                isSelected
                  ? 'border-violet-500 bg-violet-600/20 text-violet-300 shadow-md ring-2 ring-violet-500/50'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
              }`}
            >
              {style}
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';

export const RATIO_OPTIONS = [
  { id: 'Auto', label: 'Auto (Recommended)', desc: 'Smart context detection' },
  { id: '16:9', label: '16:9 Widescreen', desc: 'Standard HD presentations' },
  { id: '4:3', label: '4:3 Standard', desc: 'Traditional screens & print' },
  { id: '1:1', label: '1:1 Square', desc: 'Social & mobile feeds' },
  { id: '3:4', label: '3:4 Portrait', desc: 'Document layout' },
  { id: '9:16', label: '9:16 Vertical', desc: 'Mobile stories & reels' },
  { id: '21:9', label: '21:9 Ultrawide', desc: 'Cinematic monitors' },
];

interface RatioSelectorProps {
  selectedRatio: string;
  onSelect: (ratio: string) => void;
}

export const RatioSelector: React.FC<RatioSelectorProps> = ({ selectedRatio, onSelect }) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-300">Aspect Ratio</label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {RATIO_OPTIONS.map((opt) => {
          const isSelected = selectedRatio === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`flex flex-col items-center justify-between rounded-xl border p-3 text-center transition-all ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-600/20 text-cyan-300 shadow-md ring-2 ring-cyan-500/50'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-xs font-bold">{opt.id}</span>
              <span className="mt-1 text-[10px] text-slate-400">{opt.label.split(' ')[1] || opt.id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

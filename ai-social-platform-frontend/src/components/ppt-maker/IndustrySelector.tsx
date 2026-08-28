import React from 'react';

export const INDUSTRY_CATEGORIES = [
  'Business',
  'Marketing',
  'Medical',
  'Education',
  'Technology',
  'Finance',
  'Startup',
  'Sales',
  'Real Estate',
  'HR',
  'Consulting',
  'Research',
  'Engineering',
  'Science',
  'Healthcare',
  'Product',
  'Strategy',
];

interface IndustrySelectorProps {
  selectedIndustry: string;
  onSelect: (industry: string) => void;
}

export const IndustrySelector: React.FC<IndustrySelectorProps> = ({ selectedIndustry, onSelect }) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-300">Industry / Domain</label>
      <div className="flex flex-wrap gap-2">
        {INDUSTRY_CATEGORIES.map((ind) => {
          const isSelected = selectedIndustry === ind;
          return (
            <button
              key={ind}
              type="button"
              onClick={() => onSelect(ind)}
              className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-all ${
                isSelected
                  ? 'border-fuchsia-500 bg-fuchsia-600/20 text-fuchsia-300 shadow-md ring-2 ring-fuchsia-500/50'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
              }`}
            >
              {ind}
            </button>
          );
        })}
      </div>
    </div>
  );
};

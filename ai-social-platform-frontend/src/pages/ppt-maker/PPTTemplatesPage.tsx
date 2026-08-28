import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INDUSTRY_CATEGORIES } from '../../components/ppt-maker/IndustrySelector';
import { STYLE_CATEGORIES } from '../../components/ppt-maker/StyleSelector';
import { COLOR_PRESETS } from '../../components/ppt-maker/ColorSelector';

export const PPTTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [selectedStyle, setSelectedStyle] = useState('All');

  const templates = [
    { id: 1, name: 'Executive Business Strategy', industry: 'Business', style: 'Corporate', theme: COLOR_PRESETS[0] },
    { id: 2, name: 'Tech Startup Pitch Deck', industry: 'Startup', style: 'Modern', theme: COLOR_PRESETS[1] },
    { id: 3, name: 'Digital Marketing Campaign', industry: 'Marketing', style: 'Creative', theme: COLOR_PRESETS[2] },
    { id: 4, name: 'Medical & Healthcare Report', industry: 'Medical', style: 'Professional', theme: COLOR_PRESETS[0] },
    { id: 5, name: 'Academic Course Lecture', industry: 'Education', style: 'Academic', theme: COLOR_PRESETS[7] },
    { id: 6, name: 'Financial Growth Forecast', industry: 'Finance', style: 'Minimalist', theme: COLOR_PRESETS[4] },
  ];

  const filtered = templates.filter((t) => {
    if (selectedIndustry !== 'All' && t.industry !== selectedIndustry) return false;
    if (selectedStyle !== 'All' && t.style !== selectedStyle) return false;
    return true;
  });

  const handleUseTemplate = (t: (typeof templates)[0]) => {
    navigate(
      `/ppt-maker/create?industry=${encodeURIComponent(t.industry)}&style=${encodeURIComponent(t.style)}&topic=${encodeURIComponent(t.name)}`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Template Discovery Gallery</h1>
        <p className="text-sm text-slate-400">Filter templates by industry, style, and visual color compatibility.</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-400">Industry:</label>
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="All">All Industries</option>
            {INDUSTRY_CATEGORIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-400">Style:</label>
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="All">All Styles</option>
            {STYLE_CATEGORIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900 transition-all hover:border-violet-500/40 hover:shadow-xl"
          >
            <div
              className="flex h-40 flex-col justify-between p-6"
              style={{ backgroundColor: t.theme.bg, color: t.theme.text }}
            >
              <span className="self-start rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow" style={{ backgroundColor: t.theme.primary }}>
                {t.style}
              </span>
              <h3 className="text-lg font-extrabold" style={{ color: t.theme.primary }}>
                {t.name}
              </h3>
            </div>

            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-bold text-white">{t.industry}</p>
                <p className="text-[10px] text-slate-400">10 Slides included</p>
              </div>

              <button
                type="button"
                onClick={() => handleUseTemplate(t)}
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-violet-500"
              >
                Use Template →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

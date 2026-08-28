import React from 'react';
import type { ColorTheme } from '../../types/presentationTypes';

export const COLOR_PRESETS: ColorTheme[] = [
  { name: 'Teal', primary: '#0F766E', secondary: '#14B8A6', accent: '#F59E0B', bg: '#F8FAFC', text: '#0F172A' },
  { name: 'Blue', primary: '#1D4ED8', secondary: '#3B82F6', accent: '#F59E0B', bg: '#F8FAFC', text: '#0F172A' },
  { name: 'Purple', primary: '#6D28D9', secondary: '#8B5CF6', accent: '#EC4899', bg: '#FAF5FF', text: '#0F172A' },
  { name: 'Red', primary: '#B91C1C', secondary: '#EF4444', accent: '#F59E0B', bg: '#FEF2F2', text: '#0F172A' },
  { name: 'Green', primary: '#15803D', secondary: '#22C55E', accent: '#EAB308', bg: '#F0FDF4', text: '#0F172A' },
  { name: 'Orange', primary: '#C2410C', secondary: '#F97316', accent: '#3B82F6', bg: '#FFF7ED', text: '#0F172A' },
  { name: 'Pink', primary: '#BE185D', secondary: '#EC4899', accent: '#8B5CF6', bg: '#FDF2F8', text: '#0F172A' },
  { name: 'Navy', primary: '#1E293B', secondary: '#475569', accent: '#38BDF8', bg: '#F8FAFC', text: '#0F172A' },
  { name: 'Black', primary: '#09090B', secondary: '#27272A', accent: '#A1A1AA', bg: '#FFFFFF', text: '#09090B' },
  { name: 'Yellow', primary: '#854D0E', secondary: '#EAB308', accent: '#3B82F6', bg: '#FEFCE8', text: '#0F172A' },
  { name: 'Brown', primary: '#78350F', secondary: '#D97706', accent: '#10B981', bg: '#FFFBEB', text: '#0F172A' },
  { name: 'White', primary: '#334155', secondary: '#64748B', accent: '#6366F1', bg: '#FFFFFF', text: '#0F172A' },
];

interface ColorSelectorProps {
  selectedTheme: ColorTheme;
  onSelect: (theme: ColorTheme) => void;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({ selectedTheme, onSelect }) => {
  const [customHex, setCustomHex] = React.useState(selectedTheme.primary);

  const handleCustomColorChange = (hex: string) => {
    setCustomHex(hex);
    onSelect({
      name: 'Custom',
      primary: hex,
      secondary: hex,
      accent: '#F59E0B',
      bg: '#F8FAFC',
      text: '#0F172A',
    });
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-slate-300">Colour Palette</label>
      
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {COLOR_PRESETS.map((preset) => {
          const isSelected = selectedTheme.name === preset.name;
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => onSelect(preset)}
              className={`flex flex-col items-center justify-between rounded-xl border p-2.5 transition-all ${
                isSelected
                  ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20 ring-2 ring-violet-500/50'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center space-x-1">
                <span className="h-4 w-4 rounded-full shadow-inner" style={{ backgroundColor: preset.primary }} />
                <span className="h-4 w-4 rounded-full shadow-inner" style={{ backgroundColor: preset.secondary }} />
                <span className="h-4 w-4 rounded-full shadow-inner" style={{ backgroundColor: preset.accent }} />
              </div>
              <span className="mt-2 text-xs font-medium text-slate-300">{preset.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center space-x-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <label className="text-xs font-semibold text-slate-400">Custom HEX:</label>
        <input
          type="color"
          value={customHex}
          onChange={(e) => handleCustomColorChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
        />
        <input
          type="text"
          value={customHex}
          onChange={(e) => handleCustomColorChange(e.target.value)}
          placeholder="#0F766E"
          className="w-28 rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 text-xs text-white uppercase focus:border-violet-500 focus:outline-none"
        />
      </div>
    </div>
  );
};

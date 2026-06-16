import type { Platform } from '../../types/post';

const PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: 'twitter', label: 'Twitter/X', icon: '𝕏' },
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'facebook', label: 'Facebook', icon: '👍' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'pinterest', label: 'Pinterest', icon: '📌' },
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
];

interface PlatformSelectorProps {
  selected: string[];
  onChange: (platforms: string[]) => void;
}

export function PlatformSelector({ selected, onChange }: PlatformSelectorProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((p) => p !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORMS.map((p) => {
        const isSelected = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
              isSelected
                ? 'scale-105 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
                : 'border border-white/10 bg-white/5 text-slate-400 hover:border-violet-500/30 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <span className="text-base leading-none">{p.icon}</span>
            {p.label}
            {isSelected && <span className="ml-0.5 text-xs">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

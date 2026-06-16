import type { PostVariants } from '../../types/post';

interface VariantSelectorProps {
  variants: PostVariants;
  selected: 'A' | 'B' | 'C';
  onSelect: (key: 'A' | 'B' | 'C', content: string) => void;
  loading?: boolean;
}

const variantMeta = {
  A: { label: 'Professional', color: 'from-violet-500/20 to-violet-600/5', accent: 'text-violet-300' },
  B: { label: 'Casual', color: 'from-fuchsia-500/20 to-fuchsia-600/5', accent: 'text-fuchsia-300' },
  C: { label: 'Punchy', color: 'from-cyan-500/20 to-cyan-600/5', accent: 'text-cyan-300' },
};

export function VariantSelector({ variants, selected, onSelect, loading }: VariantSelectorProps) {
  const items = [
    { key: 'A' as const, content: variants.variantA },
    { key: 'B' as const, content: variants.variantB },
    { key: 'C' as const, content: variants.variantC },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item, i) => {
        const meta = variantMeta[item.key];
        const isSelected = selected === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key, item.content)}
            className={`animate-fade-in-up glass-card-interactive !p-4 text-left ${
              isSelected
                ? 'ring-2 ring-violet-500/50 ring-offset-2 ring-offset-[#050508]'
                : ''
            }`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div
              className={`mb-3 inline-flex rounded-lg bg-gradient-to-br ${meta.color} px-2 py-1`}
            >
              <span className={`text-xs font-semibold ${meta.accent}`}>
                Variant {item.key} · {meta.label}
              </span>
            </div>
            <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {loading && !item.content.replace(/[.…]/g, '') ? (
                <span className="inline-block h-4 w-24 animate-pulse rounded bg-white/10" />
              ) : (
                item.content || '…'
              )}
            </p>
            {isSelected && (
              <span className="mt-3 inline-block text-xs font-medium text-violet-400">
                ✓ Selected
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

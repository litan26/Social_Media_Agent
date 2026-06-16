import { getCharLimit } from '../../constants/platformLimits';

interface CharCounterProps {
  value: string;
  platforms: string[];
}

function CounterRow({ value, platform }: { value: string; platform: string }) {
  const limit = getCharLimit(platform);
  const count = value.length;
  const ratio = count / limit;
  const atLimit = count >= limit;
  const nearLimit = ratio >= 0.9;

  const color = atLimit || nearLimit ? 'text-red-400' : 'text-slate-500';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-slate-500 capitalize">{platform.replace('_', ' ')}</span>
      <span className={color}>
        {count} / {limit}
        {atLimit && ' — at limit'}
        {nearLimit && !atLimit && ' — near limit'}
      </span>
    </div>
  );
}

export function CharCounter({ value, platforms }: CharCounterProps) {
  const targets = platforms.length > 0 ? platforms : ['twitter'];

  return (
    <div className="space-y-1.5">
      {targets.map((p) => (
        <CounterRow key={p} value={value} platform={p} />
      ))}
    </div>
  );
}

export function isOverCharLimit(value: string, platforms: string[]): boolean {
  const limit = platforms.length
    ? Math.min(...platforms.map(getCharLimit))
    : 280;
  return value.length > limit;
}

export function clampToCharLimit(value: string, platforms: string[]): string {
  const limit = platforms.length
    ? Math.min(...platforms.map(getCharLimit))
    : 280;
  return value.slice(0, limit);
}

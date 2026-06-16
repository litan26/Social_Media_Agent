import { Link } from 'react-router-dom';

interface LogoProps {
  to?: string | false;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = {
  sm: { box: 'h-8 w-8 text-xs', text: 'text-lg' },
  md: { box: 'h-9 w-9 text-sm', text: 'text-xl' },
  lg: { box: 'h-12 w-12 text-base', text: 'text-2xl' },
};

export function Logo({ to = '/', size = 'md', showText = true }: LogoProps) {
  const s = sizes[size];
  const content = (
    <>
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-violet-700 font-bold text-white shadow-lg shadow-violet-500/30 ${s.box}`}
      >
        AI
      </span>
      {showText && (
        <span className={`font-display font-bold tracking-tight ${s.text}`}>
          <span className="text-gradient">Social</span>
          <span className="text-slate-400">Platform</span>
        </span>
      )}
    </>
  );

  const className = 'group flex items-center gap-2.5 transition-opacity hover:opacity-90';

  if (to !== false) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

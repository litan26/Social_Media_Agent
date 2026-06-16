import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, badge, action }: PageHeaderProps) {
  return (
    <div className="animate-fade-in-down mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {badge && <span className="badge-violet mb-3 inline-block">{badge}</span>}
        <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

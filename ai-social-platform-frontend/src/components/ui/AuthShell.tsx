import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageBackground } from './PageBackground';
import { Logo } from './Logo';
import { MarketingNav } from './MarketingNav';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative min-h-screen">
      <MarketingNav />
      <div className="lg:grid lg:min-h-[calc(100vh-73px)] lg:grid-cols-2">
      <PageBackground />
      <div className="relative hidden flex-col justify-between p-10 lg:flex xl:p-14">
        <Logo to="/" size="lg" />
        <div className="max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight text-white xl:text-5xl">
            Manage every channel from one{' '}
            <span className="text-gradient">intelligent workspace</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            Generate content with Claude, publish across seven platforms, and learn what resonates
            with your audience.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-400">
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">✓</span>
              3 AI variants per post
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">✓</span>
              Schedule & analytics built in
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">✓</span>
              Secure multi-tenant accounts
            </li>
          </ul>
        </div>
        <p className="text-xs text-slate-600">
          <Link to="/" className="hover:text-violet-300">← Back to homepage</Link>
        </p>
      </div>
      <div className="relative flex items-center justify-center px-4 py-12 lg:min-h-full">
        <div className="auth-card animate-scale-in w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo to="/" size="md" />
          </div>
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          </div>
          {children}
          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
      </div>
    </div>
  );
}

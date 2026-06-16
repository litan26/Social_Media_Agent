import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { marketingAnchors } from '../../constants/navigation';

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="marketing-nav">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        <Logo to="/" size="sm" />

        <nav className="hidden items-center gap-1 md:flex">
          {marketingAnchors.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login" className="btn-ghost !px-4 !py-2.5 !text-sm">
            Sign in
          </Link>
          <Link to="/register" className="btn-primary !px-5 !py-2.5 !text-sm">
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="btn-ghost !p-2.5 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] bg-[#050508]/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {marketingAnchors.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <hr className="my-2 border-white/[0.06]" />
            <Link
              to="/login"
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="btn-primary mt-2 w-full !py-3 text-center"
              onClick={() => setOpen(false)}
            >
              Get started free
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

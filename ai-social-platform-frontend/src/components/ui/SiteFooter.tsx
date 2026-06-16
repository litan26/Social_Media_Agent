import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { footerLinks } from '../../constants/navigation';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#050508]/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <Logo to="/" size="sm" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
            AI-powered social management — connect accounts, generate content with Claude, and
            publish across every major platform.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</p>
          <ul className="mt-4 space-y-2">
            {footerLinks.product.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-sm text-slate-500 transition-colors hover:text-violet-300"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account</p>
          <ul className="mt-4 space-y-2">
            {footerLinks.account.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-sm text-slate-500 transition-colors hover:text-violet-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.06] py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} AI Social Platform. All rights reserved.
      </div>
    </footer>
  );
}

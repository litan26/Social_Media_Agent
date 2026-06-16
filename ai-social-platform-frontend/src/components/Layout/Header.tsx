import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Logo } from '../ui/Logo';
import { appNavGroups, adminNavLinks } from '../../constants/navigation';

function getInitials(email?: string) {
  if (!email) return '?';
  return email.charAt(0).toUpperCase();
}

export function Header() {
  const { user, logout } = useAuthStore();
  const { pathname } = useLocation();
  const isSuperadmin = user?.role === 'superadmin';
  const homeLink = isSuperadmin ? '/admin/users' : '/dashboard';

  const allLinks = [
    ...(isSuperadmin ? adminNavLinks : []),
    ...appNavGroups.flatMap((g) => g.links),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050508]/90 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 md:px-6">

        {/* Logo */}
        <Logo to={homeLink} size="sm" />

        {/* Nav links — hidden on mobile (handled by MobileNav) */}
        <nav className="hidden flex-1 items-center gap-0.5 overflow-x-auto md:flex">
          {allLinks.map((link) => {
            const isActive = link.end ? pathname === link.to : pathname.startsWith(link.to);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-200'
                    : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                }`}
              >
                <link.icon className="h-3.5 w-3.5 shrink-0" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          {user && (
            <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 sm:flex">
              <span className="user-avatar">{getInitials(user.email)}</span>
              <div className="min-w-0">
                <p className="max-w-[140px] truncate text-xs font-medium text-slate-200">
                  {user.email}
                </p>
                <p className="text-[10px] capitalize text-slate-500">
                  {isSuperadmin ? 'Admin' : `${user.plan} plan`}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-slate-200"
          >
            Logout
          </button>
        </div>

      </div>
    </header>
  );
}

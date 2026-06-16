import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Logo } from '../ui/Logo';
import { adminNavLinks, appNavGroups } from '../../constants/navigation';

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const isSuperadmin = role === 'superadmin';
  const homeLink = isSuperadmin ? '/admin/users' : '/dashboard';

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-xl md:flex">
      <div className="border-b border-white/[0.06] p-4">
        <Logo to={homeLink} size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        {isSuperadmin && (
          <div className="mb-6">
            <p className="sidebar-section-label">Administration</p>
            {adminNavLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <link.icon className="h-5 w-5 shrink-0 text-violet-400/80" />
                {link.label}
              </NavLink>
            ))}
          </div>
        )}

        {appNavGroups.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <p className="sidebar-section-label">{group.label}</p>
            {group.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <link.icon className="h-5 w-5 shrink-0 text-violet-400/80" />
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="m-4 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/5 p-4">
        <p className="text-xs font-semibold text-violet-300">Quick tip</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          Connect accounts from Dashboard, then create AI-powered posts in one click.
        </p>
      </div>
    </aside>
  );
}

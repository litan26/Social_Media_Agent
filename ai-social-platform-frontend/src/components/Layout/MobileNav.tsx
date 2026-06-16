import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { IconUsers } from '../ui/Icons';
import { mobileNavLinks } from '../../constants/navigation';

export function MobileNav() {
  const role = useAuthStore((s) => s.user?.role);
  const isSuperadmin = role === 'superadmin';

  const links = isSuperadmin
    ? [{ to: '/admin/users', label: 'Users', icon: IconUsers, end: true }, ...mobileNavLinks]
    : mobileNavLinks;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#050508]/95 px-1 py-2 backdrop-blur-2xl md:hidden"
      aria-label="Main navigation"
    >
      <div className="flex justify-around">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[10px] font-medium transition-all ${
                isActive
                  ? 'bg-violet-600/15 text-violet-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <link.icon className="h-5 w-5" />
            <span className="truncate">{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

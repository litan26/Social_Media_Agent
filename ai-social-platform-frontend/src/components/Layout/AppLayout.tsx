import { Outlet } from 'react-router-dom';
import { PageBackground } from '../ui/PageBackground';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="relative min-h-screen pb-20 md:pb-0">
      <PageBackground variant="subtle" />
      <div className="mx-auto flex max-w-7xl gap-6 p-4 md:p-8">
        <Sidebar />
        <main className="flex-1">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

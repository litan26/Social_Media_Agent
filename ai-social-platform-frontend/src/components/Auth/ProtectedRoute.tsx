import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (token && !user) {
      fetchMe()
        .catch(() => {})
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [token, user, fetchMe]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  const isSuperadmin = user?.role === 'superadmin';
  const onAdmin = location.pathname.startsWith('/admin');

  if (isSuperadmin && !onAdmin && location.pathname === '/dashboard') {
    return <Navigate to="/admin/users" replace />;
  }

  return <>{children}</>;
}

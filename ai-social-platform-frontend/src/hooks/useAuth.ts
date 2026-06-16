import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { token, user, fetchMe, logout } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      fetchMe().catch(() => logout());
    }
  }, [token, user, fetchMe, logout]);

  return useAuthStore();
};

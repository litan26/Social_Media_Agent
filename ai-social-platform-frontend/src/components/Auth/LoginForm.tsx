import { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types/auth';

interface LoginFormProps {
  onSuccess?: (user: User | null) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      onSuccess?.(useAuthStore.getState().user);
    } catch (err) {
      if (!axios.isAxiosError(err) || !err.response) {
        setError('Cannot reach the server. Make sure the backend server is running.');
      } else {
        setError('Invalid credentials');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="animate-fade-in rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-premium"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input-premium"
        required
      />
      <button type="submit" disabled={isLoading} className="btn-primary w-full">
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  );
}

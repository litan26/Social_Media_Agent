import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveRegistrationDraft } from '../../lib/registrationDraft';

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function RegisterForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isValidPhone(phone)) {
      setError('Enter a valid phone number (10–15 digits).');
      return;
    }

    saveRegistrationDraft({ email: email.trim(), phone: phone.trim(), password });
    navigate('/register/plan');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="animate-fade-in rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-400">
          Email address
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-premium"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-400">
          Phone number
        </label>
        <input
          id="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input-premium"
          required
          autoComplete="tel"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-400">
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-premium"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-400">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input-premium"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <button type="submit" className="btn-primary w-full">
        Continue to plan selection
      </button>
    </form>
  );
}

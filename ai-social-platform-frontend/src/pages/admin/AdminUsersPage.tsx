import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { IconUsers, IconPlus } from '../../components/ui/Icons';
import type { User } from '../../types/auth';

export function AdminUsersPage() {
  const user = useAuthStore((s) => s.user);
  const listUsers = useAuthStore((s) => s.listUsers);
  const createUser = useAuthStore((s) => s.createUser);
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState<'free' | 'pro' | 'team'>('free');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(data);
      setError('');
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [listUsers]);

  if (user?.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);
    try {
      await createUser({ email, password, plan });
      setEmail('');
      setPassword('');
      setPlan('free');
      setSuccess(`User ${email} created successfully`);
      await loadUsers();
    } catch {
      setError('Failed to create user. Email may already exist.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Administration"
        title="User management"
        subtitle="Create and manage platform users"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="stat-card">
          <p className="text-sm text-slate-400">Total users</p>
          <p className="mt-2 font-display text-3xl font-bold text-white">{users.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-slate-400">On paid plans</p>
          <p className="mt-2 font-display text-3xl font-bold text-violet-300">
            {users.filter((u) => u.plan === 'pro' || u.plan === 'team').length}
          </p>
        </div>
      </div>

      <div className="glass-card">
        <div className="mb-5 flex items-center gap-3">
          <div className="feature-card-icon !mb-0 !h-10 !w-10">
            <IconPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Create user</h2>
            <p className="text-sm text-slate-500">Add a new account with email, password, and plan</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="alert-error">{error}</p>}
          {success && <p className="alert-success">{success}</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">Email</label>
              <input
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-premium"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">Password</label>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-premium"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as 'free' | 'pro' | 'team')}
                className="select-premium"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="team">Team</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={creating} className="btn-primary w-full md:w-auto">
                {creating ? 'Creating...' : 'Add user'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="glass-card">
        <div className="mb-5 flex items-center gap-3">
          <div className="feature-card-icon !mb-0 !h-10 !w-10">
            <IconUsers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Platform users</h2>
            <p className="text-sm text-slate-500">{users.length} managed accounts</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-12 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      No users yet. Create one above.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td className="font-medium text-slate-200">{u.email}</td>
                      <td className="capitalize">{u.plan}</td>
                      <td className="text-slate-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

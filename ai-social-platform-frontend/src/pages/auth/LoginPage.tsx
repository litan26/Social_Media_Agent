import { useNavigate, Link } from 'react-router-dom';
import { LoginForm } from '../../components/Auth/LoginForm';
import { AuthShell } from '../../components/ui/AuthShell';

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your social content."
      footer={
        <>
          Need an account?{' '}
          <Link to="/register" className="font-medium text-violet-400 hover:text-violet-300">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm
        onSuccess={(user) => {
          if (user?.role === 'superadmin') {
            navigate('/admin/users');
            return;
          }
          navigate('/dashboard');
        }}
      />
    </AuthShell>
  );
}

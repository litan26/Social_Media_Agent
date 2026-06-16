import { Link } from 'react-router-dom';
import { RegisterForm } from '../../components/Auth/RegisterForm';
import { AuthShell } from '../../components/ui/AuthShell';

export function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Sign up with your email and phone number to get started."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-violet-400 hover:text-violet-300">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}

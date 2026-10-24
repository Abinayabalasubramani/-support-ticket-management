import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, Ticket } from 'lucide-react';
import { useLoginMutation } from '../api/apiSlice';
import { selectSessionExpired, selectToken, signedIn } from '../features/auth/authSlice';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, SHOW_DEMO_LOGIN } from '../features/auth/demoAccounts';
import { isTokenExpired } from '../features/auth/token';
import { getErrorMessage } from '../utils/errors';
import FormField, { inputClass } from '../components/common/FormField';
import ThemeToggle from '../components/layout/ThemeToggle';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useSelector(selectToken);
  const expired = useSelector(selectSessionExpired);
  const [login] = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  // Already signed in: nothing to do here.
  if (token && !isTokenExpired(token)) return <Navigate to="/" replace />;

  const destination = location.state?.from || '/';

  const onSubmit = async (values) => {
    setFormError('');
    try {
      const { token: newToken, user } = await login(values).unwrap();
      dispatch(signedIn({ token: newToken, user }));
      navigate(destination, { replace: true });
    } catch (err) {
      // 401 gives one message for a wrong password and an unknown email; 429 means too many tries.
      setFormError(err?.status === 'FETCH_ERROR' ? getErrorMessage(err) : err?.data?.error?.message || getErrorMessage(err));
    }
  };

  const fillDemo = (email) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true });
    setFormError('');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg" style={{ backgroundImage: 'var(--brand-gradient)' }}>
            <Ticket className="h-6 w-6" />
          </span>
          <span className="text-2xl font-semibold tracking-tight text-fg">TicketFlow</span>
        </div>

        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-fg">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Use your support account to continue.</p>

          {expired && !formError && (
            <p role="status" className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-300">
              Your session expired. Please sign in again.
            </p>
          )}
          {formError && (
            <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {formError}
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-4">
            <FormField id="email" label="Email" error={errors.email?.message}>
              <input id="email" type="email" autoComplete="username" autoFocus placeholder="you@company.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} className={inputClass(errors.email)} {...register('email')} />
            </FormField>

            <FormField id="password" label="Password" error={errors.password?.message}>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} className={`${inputClass(errors.password)} pr-11`} {...register('password')} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-fg" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            <button type="submit" disabled={isSubmitting} className="btn-primary h-11 w-full">
              <LogIn className="h-4 w-4" />
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {SHOW_DEMO_LOGIN && (
          <div className="card mt-4 p-4 text-sm">
            <p className="font-medium text-fg">Demo accounts</p>
            <p className="mt-0.5 text-xs text-muted">
              Password for both: <code className="rounded bg-surface-2 px-1.5 py-0.5 text-fg">{DEMO_PASSWORD}</code>
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button key={account.email} type="button" onClick={() => fillDemo(account.email)} className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-left transition-colors hover:border-primary">
                  <span className="block font-medium text-fg">
                    {account.label}: {account.name}
                  </span>
                  <span className="block text-xs text-muted">{account.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

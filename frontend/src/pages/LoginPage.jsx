import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import { GoogleLoginButton } from '../components/auth/GoogleLoginButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const { login, loading } = useAuth();
  const { pushToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Please enter your password (at least 6 characters).');
      return;
    }

    try {
      await login({ email: email.trim(), password });
      pushToast('Welcome back!', 'success');
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    }
  }

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <div className="auth-card__head">
          <span className="auth-brand-badge">
            <Sparkles size={15} />
            <span>Agentic Shop Account</span>
          </span>
          <h1>Welcome back</h1>
          <p>Sign in with your email and password to sync your cart and orders.</p>
        </div>

        <GoogleLoginButton
          onSuccess={() => navigate(nextPath, { replace: true })}
          label="Continue with Google"
        />

        <div className="divider-text">
          <span>or sign in with email</span>
        </div>

        {error && (
          <div className="alert alert--danger" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Email Address</span>
            <div className="input-with-icon">
              <Mail size={16} />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-with-icon">
              <Lock size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-card__footer">
          Don&apos;t have an account?{' '}
          <Link to={`/signup${nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''}`}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}


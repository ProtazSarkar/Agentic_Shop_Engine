import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Sparkles, User as UserIcon } from 'lucide-react';
import { GoogleLoginButton } from '../components/auth/GoogleLoginButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const { register, loading } = useAuth();
  const { pushToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      pushToast('Account created! Welcome to Agentic Shop.', 'success');
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create account.');
    }
  }

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <div className="auth-card__head">
          <span className="auth-brand-badge">
            <Sparkles size={15} />
            <span>Join Agentic Shop</span>
          </span>
          <h1>Create your account</h1>
          <p>Register to track orders, save your cart, and check out faster.</p>
        </div>

        <GoogleLoginButton
          onSuccess={() => navigate(nextPath, { replace: true })}
          label="Continue with Google"
        />

        <div className="divider-text">
          <span>or register with email</span>
        </div>

        {error && (
          <div className="alert alert--danger" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Full Name</span>
            <div className="input-with-icon">
              <UserIcon size={16} />
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                required
              />
            </div>
          </label>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
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

          <label className="field">
            <span>Confirm Password</span>
            <div className="input-with-icon">
              <Lock size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </div>
          </label>

          <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account?{' '}
          <Link to={`/login${nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''}`}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}


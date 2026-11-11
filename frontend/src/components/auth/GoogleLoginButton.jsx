import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function GoogleLoginButton({ onSuccess, label = 'Continue with Google' }) {
  const { googleLogin, apiMode, loading } = useAuth();
  const { pushToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('alex.google@gmail.com');
  const [googleName, setGoogleName] = useState('Alex Mercer');

  async function handleGoogleAuth() {
    if (GOOGLE_CLIENT_ID && apiMode === 'live') {
      const redirectUri = `${window.location.origin}/oauth/google/callback`;
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account',
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      return;
    }

    if (apiMode === 'live' && !GOOGLE_CLIENT_ID) {
      setModalOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      await googleLogin({
        email: 'alex.google@gmail.com',
        name: 'Alex Mercer',
      });
      pushToast('Signed in with Google.', 'success');
      onSuccess?.();
    } catch (err) {
      pushToast(err.message || 'Google sign-in failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDevGoogleSubmit(e) {
    e.preventDefault();
    const trimmedEmail = googleEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      pushToast('Please enter a valid Google email address.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await googleLogin({
        email: trimmedEmail,
        name: googleName.trim(),
      });
      setModalOpen(false);
      pushToast('Signed in with Google.', 'success');
      onSuccess?.();
    } catch (err) {
      pushToast(err.message || 'Google sign-in failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--google"
        onClick={handleGoogleAuth}
        disabled={loading || submitting}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.3 0 6.08-1.09 8.11-2.96l-3.88-3.05c-1.09.73-2.48 1.16-4.23 1.16-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.05 21.2 7.21 24 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.02 14.01c-.25-.73-.39-1.51-.39-2.31s.14-1.58.39-2.31V6.25H1.01A11.98 11.98 0 0 0 0 11.7c0 1.93.46 3.76 1.01 5.45l4.01-3.14Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.79 0 3.4.62 4.67 1.82l3.5-3.5C18.07 1.19 15.3 0 12 0 7.21 0 3.05 2.8 1.01 6.25l4.01 3.14C6 6.94 8.75 4.75 12 4.75Z"
          />
        </svg>
        <span>{submitting ? 'Connecting Google...' : label}</span>
      </button>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Google Sign-In"
          >
            <div className="modal-card__head">
              <h3>Continue with Google</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="modal-card__sub">
              Confirm your Google account details to sign in quickly.
            </p>
            <form className="auth-form" onSubmit={handleDevGoogleSubmit}>
              <label className="field">
                <span>Google Email</span>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Full Name</span>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="btn btn--primary btn--full"
                disabled={submitting}
              >
                {submitting ? 'Signing in...' : 'Continue with Google Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

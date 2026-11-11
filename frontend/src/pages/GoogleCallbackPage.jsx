import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const { pushToast } = useToast();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setError('Google sign-in was cancelled or unavailable.');
      return;
    }
    if (!code) {
      setError('Missing Google sign-in confirmation code.');
      return;
    }

    googleLogin({ code })
      .then(() => {
        pushToast('Signed in with Google!', 'success');
        navigate('/', { replace: true });
      })
      .catch((err) => {
        setError(err.message || 'Could not complete Google sign-in.');
      });
  }, [searchParams, googleLogin, navigate, pushToast]);

  return (
    <div className="container auth-page">
      <div className="auth-card">
        {error ? (
          <div className="empty-state">
            <h2>Google Sign-In Failed</h2>
            <p>{error}</p>
            <Link to="/login" className="btn btn--primary">
              Return to Login
            </Link>
          </div>
        ) : (
          <div className="empty-state">
            <h2>Completing Google Sign-In…</h2>
            <p>Just a moment while we sign you in.</p>
          </div>
        )}
      </div>
    </div>
  );
}


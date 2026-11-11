import { apiRequest, clearStoredAuth, storeAuth, withBackendFallback } from './client';
import { mockAdapter } from './mockAdapter';

function normalizeAuthResponse(raw, fallbackEmail, provider) {
  const jwt = raw?.access || raw?.access_token;
  const drfToken = raw?.key || raw?.token;
  const token = jwt || drfToken || '';
  const isJwtFormat = Boolean(jwt || (token && token.split('.').length === 3));
  const tokenScheme = isJwtFormat ? 'Bearer' : 'Token';

  const user = {
    id: raw?.user?.id ?? raw?.id ?? 'me',
    email: raw?.user?.email ?? raw?.email ?? fallbackEmail,
    name:
      raw?.user?.name ||
      [raw?.user?.first_name, raw?.user?.last_name].filter(Boolean).join(' ') ||
      raw?.name ||
      (raw?.user?.email ?? fallbackEmail).split('@')[0],
    first_name: raw?.user?.first_name,
    last_name: raw?.user?.last_name,
    avatar_url: raw?.user?.avatar_url,
    provider,
  };

  return {
    token,
    tokenScheme,
    refreshToken: raw?.refresh || raw?.refresh_token,
    user,
  };
}

export const authApi = {
  async register({ email, password, name }) {
    const cleanEmail = email.trim().toLowerCase();
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ');
    const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') || 'shopper';

    const auth = await withBackendFallback(
      async () => {
        const raw = await apiRequest('/api/auth/register/', {
          method: 'POST',
          body: JSON.stringify({
            email: cleanEmail,
            username: baseUsername,
            password,
            password_confirm: password,
            password1: password,
            password2: password,
            name,
            first_name: firstName,
            last_name: lastName,
          }),
        });
        return normalizeAuthResponse(raw, cleanEmail, 'email');
      },
      () => mockAdapter.register(cleanEmail, password, name)
    );

    if (auth.token) {
      storeAuth(auth);
    }
    return auth;
  },

  async login({ email, password }) {
    const auth = await withBackendFallback(
      async () => {
        const raw = await apiRequest('/api/auth/login/', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        return normalizeAuthResponse(raw, email, 'email');
      },
      () => mockAdapter.login(email, password)
    );

    if (auth.token) {
      storeAuth(auth);
    }
    return auth;
  },

  async googleLogin({ code, access_token, id_token, email, name }) {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    const auth = await withBackendFallback(
      async () => {
        const raw = await apiRequest('/api/auth/google/', {
          method: 'POST',
          body: JSON.stringify({
            code,
            access_token,
            id_token,
            redirect_uri: `${window.location.origin}/oauth/google/callback`,
            email,
            name,
            first_name: parts[0] || '',
            last_name: parts.slice(1).join(' '),
          }),
        });
        return normalizeAuthResponse(raw, email || 'google-user@gmail.com', 'google');
      },
      () => mockAdapter.googleLogin(email, name)
    );

    if (auth.token) {
      storeAuth(auth);
    }
    return auth;
  },

  async logout() {
    try {
      await withBackendFallback(
        () =>
          apiRequest('/api/auth/logout/', {
            method: 'POST',
          }),
        () => mockAdapter.logout()
      );
    } finally {
      clearStoredAuth();
    }
  },
};


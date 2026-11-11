const TOKEN_KEY = 'ase_auth_token';
const SCHEME_KEY = 'ase_auth_scheme';
const REFRESH_KEY = 'ase_refresh_token';
const USER_KEY = 'ase_auth_user';
const MODE_OVERRIDE_KEY = 'ase_api_mode_override';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class BackendUnavailableError extends Error {
  constructor(message = 'Backend API endpoint is unavailable or not yet mounted.') {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

let currentMode = localStorage.getItem(MODE_OVERRIDE_KEY) || 'live';
const modeListeners = new Set();

export function getApiMode() {
  return currentMode;
}

export function setApiMode(mode, persist = false) {
  if (persist) {
    localStorage.setItem(MODE_OVERRIDE_KEY, mode);
  }
  if (currentMode !== mode) {
    currentMode = mode;
    modeListeners.forEach((cb) => cb(mode));
  }
}

export function clearApiModeOverride() {
  localStorage.removeItem(MODE_OVERRIDE_KEY);
  setApiMode('live', false);
}

export function subscribeApiMode(listener) {
  modeListeners.add(listener);
  return () => {
    modeListeners.delete(listener);
  };
}

export function getStoredAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const tokenScheme = localStorage.getItem(SCHEME_KEY) || 'Bearer';
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  let user = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      user = null;
    }
  }
  return { token, tokenScheme, refreshToken, user };
}

export function storeAuth({ token, tokenScheme = 'Bearer', refreshToken, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SCHEME_KEY, tokenScheme);
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_KEY);
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SCHEME_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function extractErrorMessage(data, fallback) {
  if (!data || typeof data !== 'object') {
    return fallback;
  }
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
    return String(data.non_field_errors[0]);
  }
  for (const [field, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > 0) {
      return `${field}: ${String(value[0])}`;
    }
    if (typeof value === 'string') {
      return `${field}: ${value}`;
    }
  }
  return fallback;
}

export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export async function apiRequest(path, options = {}) {
  if (localStorage.getItem(MODE_OVERRIDE_KEY) === 'demo') {
    throw new BackendUnavailableError('Local preview mode forced.');
  }

  const { token, tokenScheme } = getStoredAuth();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `${tokenScheme} ${token}`);
  }
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method) && !headers.has('X-CSRFToken')) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      headers.set('X-CSRFToken', csrfToken);
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    setApiMode('demo');
    throw new BackendUnavailableError('Unable to reach backend server.');
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (
    response.status === 502 ||
    response.status === 503 ||
    response.status === 504 ||
    (response.status === 404 && !isJson) ||
    (response.status === 500 && !isJson)
  ) {
    setApiMode('demo');
    throw new BackendUnavailableError(`Endpoint ${path} is not mounted on backend yet.`);
  }

  setApiMode('live');

  if (response.status === 204) {
    return undefined;
  }

  const payload = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message = extractErrorMessage(
      payload,
      `Request failed (${response.status} ${response.statusText})`
    );
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export async function withBackendFallback(liveCall, demoCall) {
  if (currentMode === 'demo' && localStorage.getItem(MODE_OVERRIDE_KEY) === 'demo') {
    return await demoCall();
  }
  try {
    return await liveCall();
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return await demoCall();
    }
    throw err;
  }
}

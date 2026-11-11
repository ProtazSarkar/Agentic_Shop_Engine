const SAFE_INTERNAL_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/shop$/,
  /^\/products\/[1-9]\d*$/,
  /^\/cart$/,
  /^\/checkout$/,
  /^\/orders$/,
  /^\/login$/,
  /^\/signup$/,
];

const UNSAFE_SCHEME_OR_CONTROL_RE =
  /(?:https?:|javascript:|data:|vbscript:|file:|\/\/|\\\\|[\u0000-\u001f\u007f<>])/i;

export function isSafeInternalRoute(path) {
  if (typeof path !== 'string') return false;
  const candidate = path.trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/\\')) {
    return false;
  }
  if (UNSAFE_SCHEME_OR_CONTROL_RE.test(candidate)) {
    return false;
  }

  try {
    const parsed = new URL(candidate, 'http://storefront.local');
    if (parsed.origin !== 'http://storefront.local') {
      return false;
    }
    if (parsed.pathname.includes('@')) {
      return false;
    }
    return SAFE_INTERNAL_ROUTE_PATTERNS.some((pattern) => pattern.test(parsed.pathname));
  } catch {
    return false;
  }
}


const SAFE_PREFIXES = ['/(public)/', '/(player)/', '/(booking)/'];
const BLOCKED_PREFIXES = ['/(auth)/', '/(onboarding)/'];

const decodeBestEffort = (value) => {
  if (typeof value !== 'string') return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const hasForbiddenProtocol = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return false;
  if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('//')) {
    return true;
  }
  return /^[a-z][a-z0-9+.-]*:/i.test(text);
};

export function sanitizeRedirectTo(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const decoded = decodeBestEffort(decodeBestEffort(raw)).trim();
  if (!decoded) return null;
  if (!decoded.startsWith('/')) return null;
  if (/[\r\n]/.test(decoded)) return null;
  if (decoded.includes('\\')) return null;
  if (hasForbiddenProtocol(raw) || hasForbiddenProtocol(decoded)) return null;
  if (BLOCKED_PREFIXES.some((prefix) => decoded.startsWith(prefix))) return null;
  if (!SAFE_PREFIXES.some((prefix) => decoded.startsWith(prefix))) return null;

  return decoded;
}

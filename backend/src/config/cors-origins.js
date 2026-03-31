/**
 * CORS allowlist from CORS_ORIGINS (comma-separated).
 * Normalizes env quirks: wrapping quotes, trailing slashes, case (Origin is effectively case-insensitive for host).
 */

export function normalizeOriginUrl(origin) {
  if (origin == null || origin === '') return '';
  let s = String(origin).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/\/+$/, '');
  return s.toLowerCase();
}

/**
 * @param {string | undefined} value - usually process.env.CORS_ORIGINS
 * @returns {string[] | null} null = allow any origin (reflect)
 */
export function parseCorsOriginsEnv(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  let v = raw;
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  if (!v) return null;
  const arr = v
    .split(',')
    .map((s) => normalizeOriginUrl(s))
    .filter(Boolean);
  return arr.length ? arr : null;
}

/** @param {string[] | null} origins */
export function toExpressCorsOrigin(origins) {
  if (origins == null) return true;
  const set = new Set(origins);
  return (origin, cb) => {
    if (!origin) return cb(null, true);
    if (set.has(normalizeOriginUrl(origin))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  };
}

/** @param {string[] | null} origins */
export function toSocketIoCorsOrigin(origins) {
  if (origins == null) return true;
  const set = new Set(origins);
  return (origin, cb) => {
    if (!origin) return cb(null, true);
    if (set.has(normalizeOriginUrl(origin))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  };
}

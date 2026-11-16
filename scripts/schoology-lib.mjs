// Schoology API client for the parent's own key (SCHOOLOGY_CONSUMER_KEY / _SECRET in .env, never printed or logged).
// Two-legged OAuth 1.0 with PLAINTEXT signing, as Schoology documents for personal API keys. Read-only GETs.
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

export const API = 'https://api.schoology.com/v1';

export function loadEnv(file = join(ROOT, '.env')) {
  const env = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return env;
}

/** The Authorization header for one request (a fresh nonce and timestamp each time). */
export function authHeader(key, secret, now = Date.now(), nonce = randomBytes(12).toString('hex')) {
  const p = { oauth_consumer_key: key, oauth_nonce: nonce, oauth_signature_method: 'PLAINTEXT', oauth_timestamp: String(Math.floor(now / 1000)), oauth_token: '', oauth_version: '1.0', oauth_signature: `${encodeURIComponent(secret)}%26` };
  return `OAuth realm="Schoology API", ${Object.entries(p).map(([k, v]) => `${k}="${k === 'oauth_signature' ? v : encodeURIComponent(v)}"`).join(', ')}`;
}

export function client(env = loadEnv()) {
  const key = env.SCHOOLOGY_CONSUMER_KEY, secret = env.SCHOOLOGY_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('Add SCHOOLOGY_CONSUMER_KEY and SCHOOLOGY_CONSUMER_SECRET to .env');
  const get = async (path, tries = 3) => {
    const url = path.startsWith('http') ? path : `${API}${path}`;
    const r = await fetch(url, { headers: { Authorization: authHeader(key, secret), Accept: 'application/json' }, redirect: 'manual' });
    if (r.status === 303 || r.status === 302) return get(r.headers.get('location'), tries); // Schoology redirects /users/me
    if (r.status === 429 && tries > 1) { await new Promise((ok) => setTimeout(ok, 2000)); return get(path, tries - 1); }
    if (!r.ok) throw Object.assign(new Error(`Schoology ${r.status} for ${new URL(url).pathname}`), { status: r.status });
    return r.json();
  };
  /** Every page of a list endpoint ("links.next"), as one array of items under `field`. */
  const all = async (path, field) => {
    const out = [];
    let next = `${path}${path.includes('?') ? '&' : '?'}limit=200`;
    while (next) { const page = await get(next); out.push(...(page[field] || [])); next = page.links?.next || null; }
    return out;
  };
  return { get, all };
}

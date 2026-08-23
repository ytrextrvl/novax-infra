import crypto from 'node:crypto';

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromB64url(input) {
  return Buffer.from(input, 'base64url');
}

function signingKey() {
  const secret = process.env.BRIDGE_ADMIN_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('BRIDGE_ADMIN_SECRET must be configured and at least 16 characters long.');
  }
  return crypto.createHash('sha256').update(`novax-hostinger-mcp:${secret}`).digest();
}

function mac(data) {
  return crypto.createHmac('sha256', signingKey()).update(data).digest('base64url');
}

export function signPayload(payload, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  return `${body}.${mac(body)}`;
}

export function verifyPayload(token, expectedType) {
  if (!token || typeof token !== 'string') return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = mac(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(fromB64url(body).toString('utf8'));
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) return null;
  if (expectedType && payload.type !== expectedType) return null;
  return payload;
}

export function safeEqualSecret(value) {
  const expected = process.env.BRIDGE_ADMIN_SECRET || '';
  const a = Buffer.from(String(value || ''));
  const b = Buffer.from(expected);
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

export function createClientId(metadata) {
  return signPayload({
    type: 'client',
    redirect_uris: metadata.redirect_uris || [],
    client_name: metadata.client_name || 'ChatGPT',
    token_endpoint_auth_method: 'none',
  }, 365 * 24 * 60 * 60);
}

export function validateClient(clientId, redirectUri) {
  const client = verifyPayload(clientId, 'client');
  if (!client) return null;
  if (redirectUri && !client.redirect_uris?.includes(redirectUri)) return null;
  return client;
}

export function createAuthorizationCode({ clientId, redirectUri, scope, codeChallenge }) {
  return signPayload({
    type: 'code',
    client_id_hash: crypto.createHash('sha256').update(clientId).digest('base64url'),
    redirect_uri: redirectUri,
    scope: scope || 'hostinger offline_access',
    code_challenge: codeChallenge || null,
  }, 5 * 60);
}

export function verifyAuthorizationCode(code, clientId, redirectUri, codeVerifier) {
  const payload = verifyPayload(code, 'code');
  if (!payload) return null;
  const clientHash = crypto.createHash('sha256').update(clientId).digest('base64url');
  if (payload.client_id_hash !== clientHash) return null;
  if (payload.redirect_uri !== redirectUri) return null;
  if (payload.code_challenge) {
    if (!codeVerifier) return null;
    const challenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    if (challenge !== payload.code_challenge) return null;
  }
  return payload;
}

export function createAccessToken(scope) {
  return signPayload({ type: 'access', sub: 'owner', scope: scope || 'hostinger' }, 60 * 60);
}

export function createRefreshToken(scope) {
  return signPayload({ type: 'refresh', sub: 'owner', scope: scope || 'hostinger offline_access' }, 30 * 24 * 60 * 60);
}

export function verifyAccessToken(token) {
  return verifyPayload(token, 'access');
}

export function verifyRefreshToken(token) {
  return verifyPayload(token, 'refresh');
}

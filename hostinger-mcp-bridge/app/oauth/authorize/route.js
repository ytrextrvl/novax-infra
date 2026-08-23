import { createAuthorizationCode, safeEqualSecret, validateClient } from '../../../lib/oauth.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function page(inner, status = 200) {
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hostinger MCP Authorization</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#f6f7f9;margin:0;padding:32px;color:#111827}.card{max-width:520px;margin:8vh auto;background:#fff;padding:28px;border-radius:16px;box-shadow:0 8px 30px #0001}.logo{font-weight:800;font-size:22px}.muted{color:#6b7280;line-height:1.55}.field{margin:22px 0}label{display:block;font-weight:650;margin-bottom:8px}input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #d1d5db;border-radius:10px;font-size:16px}button{width:100%;padding:12px 16px;border:0;border-radius:10px;background:#111827;color:white;font-size:16px;font-weight:700}.warn{padding:12px;border-radius:10px;background:#fff7ed;color:#9a3412;margin:18px 0}.err{padding:12px;border-radius:10px;background:#fef2f2;color:#991b1b;margin:18px 0}</style>
</head><body><div class="card">${inner}</div></body></html>`, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id') || '';
  const redirectUri = url.searchParams.get('redirect_uri') || '';
  const responseType = url.searchParams.get('response_type') || '';
  const scope = url.searchParams.get('scope') || 'hostinger offline_access';
  const state = url.searchParams.get('state') || '';
  const codeChallenge = url.searchParams.get('code_challenge') || '';
  const codeChallengeMethod = url.searchParams.get('code_challenge_method') || '';
  const resource = url.searchParams.get('resource') || '';

  const client = validateClient(clientId, redirectUri);
  if (!client || responseType !== 'code') {
    return page('<div class="logo">Authorization request rejected</div><div class="err">Invalid OAuth client, redirect URI, or response type.</div>', 400);
  }
  if (codeChallengeMethod && codeChallengeMethod !== 'S256') {
    return page('<div class="logo">Authorization request rejected</div><div class="err">Only PKCE S256 is supported.</div>', 400);
  }

  return page(`
    <div class="logo">Hostinger MCP Bridge</div>
    <p class="muted">ChatGPT is requesting access to your private Hostinger bridge. Authorizing this connection can allow ChatGPT to perform actions available through your Hostinger API token.</p>
    <div class="warn">Only continue if you started this connection from your own ChatGPT account.</div>
    <form method="post" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${esc(clientId)}">
      <input type="hidden" name="redirect_uri" value="${esc(redirectUri)}">
      <input type="hidden" name="response_type" value="code">
      <input type="hidden" name="scope" value="${esc(scope)}">
      <input type="hidden" name="state" value="${esc(state)}">
      <input type="hidden" name="code_challenge" value="${esc(codeChallenge)}">
      <input type="hidden" name="code_challenge_method" value="${esc(codeChallengeMethod)}">
      <input type="hidden" name="resource" value="${esc(resource)}">
      <div class="field"><label for="admin_secret">Bridge admin secret</label><input id="admin_secret" name="admin_secret" type="password" autocomplete="current-password" required></div>
      <button type="submit">Authorize ChatGPT</button>
    </form>
  `);
}

export async function POST(request) {
  const form = await request.formData();
  const clientId = String(form.get('client_id') || '');
  const redirectUri = String(form.get('redirect_uri') || '');
  const scope = String(form.get('scope') || 'hostinger offline_access');
  const state = String(form.get('state') || '');
  const codeChallenge = String(form.get('code_challenge') || '');
  const method = String(form.get('code_challenge_method') || '');
  const adminSecret = String(form.get('admin_secret') || '');

  if (!validateClient(clientId, redirectUri) || (method && method !== 'S256')) {
    return page('<div class="logo">Authorization failed</div><div class="err">The OAuth request is no longer valid.</div>', 400);
  }
  if (!safeEqualSecret(adminSecret)) {
    return page('<div class="logo">Authorization failed</div><div class="err">Incorrect bridge admin secret.</div>', 401);
  }

  const code = createAuthorizationCode({
    clientId,
    redirectUri,
    scope,
    codeChallenge: codeChallenge || null,
  });
  const destination = new URL(redirectUri);
  destination.searchParams.set('code', code);
  if (state) destination.searchParams.set('state', state);
  return Response.redirect(destination, 302);
}

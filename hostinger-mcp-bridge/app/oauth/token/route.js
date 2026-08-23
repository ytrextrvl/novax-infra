import {
  createAccessToken,
  createRefreshToken,
  verifyAuthorizationCode,
  verifyRefreshToken,
  validateClient,
} from '../../../lib/oauth.js';

function oauthError(error, description, status = 400) {
  return Response.json({ error, error_description: description }, {
    status,
    headers: { 'cache-control': 'no-store', pragma: 'no-cache' },
  });
}

export async function POST(request) {
  const form = await request.formData();
  const grantType = String(form.get('grant_type') || '');
  const clientId = String(form.get('client_id') || '');

  if (!validateClient(clientId)) {
    return oauthError('invalid_client', 'Unknown or expired client registration.', 401);
  }

  if (grantType === 'authorization_code') {
    const code = String(form.get('code') || '');
    const redirectUri = String(form.get('redirect_uri') || '');
    const codeVerifier = String(form.get('code_verifier') || '');
    const payload = verifyAuthorizationCode(code, clientId, redirectUri, codeVerifier);
    if (!payload) return oauthError('invalid_grant', 'Invalid, expired, or mismatched authorization code.');

    const accessToken = createAccessToken(payload.scope);
    const refreshToken = createRefreshToken(payload.scope);
    return Response.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: payload.scope,
    }, { headers: { 'cache-control': 'no-store', pragma: 'no-cache' } });
  }

  if (grantType === 'refresh_token') {
    const refresh = String(form.get('refresh_token') || '');
    const payload = verifyRefreshToken(refresh);
    if (!payload) return oauthError('invalid_grant', 'Invalid or expired refresh token.');
    return Response.json({
      access_token: createAccessToken(payload.scope),
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: createRefreshToken(payload.scope),
      scope: payload.scope,
    }, { headers: { 'cache-control': 'no-store', pragma: 'no-cache' } });
  }

  return oauthError('unsupported_grant_type', 'Supported grants: authorization_code, refresh_token.');
}

import { createClientId } from '../../../lib/oauth.js';

export async function POST(request) {
  let metadata;
  try {
    metadata = await request.json();
  } catch {
    return Response.json({ error: 'invalid_client_metadata' }, { status: 400 });
  }

  if (!Array.isArray(metadata.redirect_uris) || metadata.redirect_uris.length === 0) {
    return Response.json({ error: 'invalid_redirect_uris' }, { status: 400 });
  }

  for (const uri of metadata.redirect_uris) {
    try {
      const parsed = new URL(uri);
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('bad protocol');
    } catch {
      return Response.json({ error: 'invalid_redirect_uri' }, { status: 400 });
    }
  }

  const clientId = createClientId(metadata);
  return Response.json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: metadata.client_name || 'ChatGPT',
    redirect_uris: metadata.redirect_uris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  }, { status: 201 });
}

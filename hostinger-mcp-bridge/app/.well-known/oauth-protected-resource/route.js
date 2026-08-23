export async function GET(request) {
  const origin = new URL(request.url).origin;
  return Response.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: ['hostinger', 'offline_access'],
    bearer_methods_supported: ['header'],
    resource_documentation: `${origin}/`,
  });
}

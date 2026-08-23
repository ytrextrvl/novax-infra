import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { searchOperations, getOperationDetails, executeOperation } from '../../../lib/hostinger.js';
import { verifyAccessToken } from '../../../lib/oauth.js';

export const maxDuration = 60;

function textResult(value) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  };
}

const mcpHandler = createMcpHandler(
  (server) => {
    server.tool(
      'hostinger_search_operations',
      'Search the complete official Hostinger API catalog. Use this before executing an unfamiliar operation. Returns operation IDs, methods, paths, summaries and tags.',
      {
        query: z.string().describe('Natural-language keywords such as domains DNS websites hosting VPS billing ecommerce'),
        limit: z.number().int().min(1).max(50).optional().describe('Maximum number of matches, default 20'),
      },
      async ({ query, limit }) => textResult(await searchOperations(query, limit)),
    );

    server.tool(
      'hostinger_get_operation',
      'Inspect one Hostinger API operation before calling it. Returns required path/query parameters and accepted request-body schemas.',
      {
        operation_id: z.string().describe('Exact operation_id returned by hostinger_search_operations'),
      },
      async ({ operation_id }) => textResult(await getOperationDetails(operation_id)),
    );

    server.tool(
      'hostinger_execute_operation',
      'Execute any operation from the official Hostinger API specification. This tool can read, create, modify, delete, deploy, purchase, or otherwise affect Hostinger resources depending on the chosen operation. Inspect the operation first and obtain user confirmation for consequential actions.',
      {
        operation_id: z.string().describe('Exact operation_id returned by hostinger_search_operations'),
        path_params: z.any().optional().describe('Object containing path parameters such as domain, username, or id'),
        query: z.any().optional().describe('Object containing query-string parameters'),
        body: z.any().optional().describe('JSON request body when the operation accepts application/json'),
        multipart: z.any().optional().describe('Multipart fields. A file field may be {filename, content_base64, content_type}.'),
        raw_body_base64: z.string().optional().describe('Raw binary request body encoded as base64, when required'),
        content_type: z.string().optional().describe('Optional Content-Type override for raw or JSON body'),
        headers: z.any().optional().describe('Optional additional non-authentication request headers'),
      },
      async (args) => textResult(await executeOperation(args)),
    );
  },
  {},
  { basePath: '/api' },
);

async function authorized(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!verifyAccessToken(token)) {
    const origin = new URL(request.url).origin;
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: {
        'content-type': 'application/json',
        'www-authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
      },
    });
  }
  return mcpHandler(request);
}

export const GET = authorized;
export const POST = authorized;
export const DELETE = authorized;

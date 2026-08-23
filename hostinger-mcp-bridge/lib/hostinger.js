const OPENAPI_URL = 'https://raw.githubusercontent.com/hostinger/api/main/openapi.json';
const FALLBACK_BASE_URL = 'https://developers.hostinger.com';
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

let cachedSpec = null;
let cachedAt = 0;

export async function getSpec() {
  if (cachedSpec && Date.now() - cachedAt < 60 * 60 * 1000) return cachedSpec;

  const response = await fetch(OPENAPI_URL, {
    headers: { 'user-agent': 'novax-hostinger-mcp-bridge/1.0' },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Unable to load Hostinger OpenAPI specification: HTTP ${response.status}`);
  }

  cachedSpec = await response.json();
  cachedAt = Date.now();
  return cachedSpec;
}

function listOperationsFromSpec(spec) {
  const operations = [];
  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem || {})) {
      if (!HTTP_METHODS.has(method.toLowerCase()) || !operation || typeof operation !== 'object') continue;
      const key = operation.operationId || `${method.toUpperCase()} ${path}`;
      operations.push({
        key,
        operationId: operation.operationId || null,
        method: method.toUpperCase(),
        path,
        summary: operation.summary || '',
        description: operation.description || '',
        tags: operation.tags || [],
        operation,
        pathItem,
      });
    }
  }
  return operations;
}

export async function searchOperations(query, limit = 20) {
  const spec = await getSpec();
  const q = String(query || '').trim().toLowerCase();
  const max = Math.max(1, Math.min(Number(limit) || 20, 50));
  const all = listOperationsFromSpec(spec);

  const scored = all.map((item) => {
    const haystack = [
      item.key,
      item.summary,
      item.description,
      item.path,
      ...(item.tags || []),
    ].join(' ').toLowerCase();

    let score = 0;
    if (!q) score = 1;
    else {
      const terms = q.split(/\s+/).filter(Boolean);
      for (const term of terms) {
        if (item.key.toLowerCase().includes(term)) score += 10;
        if (item.summary.toLowerCase().includes(term)) score += 7;
        if (item.path.toLowerCase().includes(term)) score += 6;
        if ((item.tags || []).some((tag) => String(tag).toLowerCase().includes(term))) score += 5;
        if (haystack.includes(term)) score += 2;
      }
    }
    return { item, score };
  }).filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.item.key.localeCompare(b.item.key));

  return scored.slice(0, max).map(({ item }) => ({
    operation_id: item.key,
    method: item.method,
    path: item.path,
    summary: item.summary,
    tags: item.tags,
  }));
}

function decodePointerPart(part) {
  return part.replace(/~1/g, '/').replace(/~0/g, '~');
}

function resolveRef(spec, ref, depth = 0) {
  if (!ref || !ref.startsWith('#/') || depth > 6) return { $ref: ref };
  let value = spec;
  for (const raw of ref.slice(2).split('/')) {
    value = value?.[decodePointerPart(raw)];
  }
  return simplifySchema(spec, value, depth + 1);
}

function simplifySchema(spec, schema, depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 6) return schema;
  if (schema.$ref) return resolveRef(spec, schema.$ref, depth + 1);

  const out = {};
  for (const key of ['type', 'format', 'title', 'description', 'required', 'enum', 'default', 'example', 'nullable']) {
    if (schema[key] !== undefined) out[key] = schema[key];
  }
  if (schema.items) out.items = simplifySchema(spec, schema.items, depth + 1);
  if (schema.properties) {
    out.properties = {};
    for (const [name, child] of Object.entries(schema.properties)) {
      out.properties[name] = simplifySchema(spec, child, depth + 1);
    }
  }
  if (Array.isArray(schema.oneOf)) out.oneOf = schema.oneOf.map((x) => simplifySchema(spec, x, depth + 1));
  if (Array.isArray(schema.anyOf)) out.anyOf = schema.anyOf.map((x) => simplifySchema(spec, x, depth + 1));
  if (Array.isArray(schema.allOf)) out.allOf = schema.allOf.map((x) => simplifySchema(spec, x, depth + 1));
  return out;
}

async function findOperation(operationId) {
  const spec = await getSpec();
  const all = listOperationsFromSpec(spec);
  const found = all.find((item) => item.key === operationId || item.operationId === operationId);
  if (!found) throw new Error(`Unknown Hostinger operation_id: ${operationId}`);
  return { spec, ...found };
}

export async function getOperationDetails(operationId) {
  const { spec, operation, pathItem, key, method, path, summary, description, tags } = await findOperation(operationId);
  const parameters = [...(pathItem.parameters || []), ...(operation.parameters || [])].map((p) => {
    const param = p?.$ref ? resolveRef(spec, p.$ref) : p;
    return {
      name: param?.name,
      in: param?.in,
      required: Boolean(param?.required),
      description: param?.description || '',
      schema: simplifySchema(spec, param?.schema),
    };
  });

  const requestBodies = {};
  const requestBody = operation.requestBody?.$ref
    ? resolveRef(spec, operation.requestBody.$ref)
    : operation.requestBody;

  for (const [contentType, item] of Object.entries(requestBody?.content || {})) {
    requestBodies[contentType] = simplifySchema(spec, item?.schema);
  }

  return {
    operation_id: key,
    method,
    path,
    summary,
    description,
    tags,
    parameters,
    request_body_required: Boolean(requestBody?.required),
    request_bodies: requestBodies,
  };
}

function applyPathParams(path, params, operation) {
  const values = params || {};
  const required = [...(operation.pathItem?.parameters || []), ...(operation.operation?.parameters || [])]
    .filter((p) => p?.in === 'path' && p?.required)
    .map((p) => p.name);

  let result = path;
  for (const name of required) {
    if (values[name] === undefined || values[name] === null || values[name] === '') {
      throw new Error(`Missing required path parameter: ${name}`);
    }
  }

  result = result.replace(/\{([^}]+)\}/g, (_, name) => {
    if (values[name] === undefined || values[name] === null) {
      throw new Error(`Missing path parameter: ${name}`);
    }
    return encodeURIComponent(String(values[name]));
  });
  return result;
}

function appendQuery(url, query) {
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const entry of value) url.searchParams.append(key, String(entry));
    } else if (typeof value === 'object') {
      url.searchParams.set(key, JSON.stringify(value));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

function sanitizeExtraHeaders(extraHeaders) {
  const blocked = new Set(['authorization', 'host', 'content-length', 'connection', 'transfer-encoding']);
  const out = {};
  for (const [key, value] of Object.entries(extraHeaders || {})) {
    if (blocked.has(String(key).toLowerCase())) continue;
    out[key] = String(value);
  }
  return out;
}

function buildMultipart(multipart) {
  const form = new FormData();
  for (const [name, value] of Object.entries(multipart || {})) {
    if (value && typeof value === 'object' && value.content_base64) {
      const bytes = Buffer.from(value.content_base64, 'base64');
      const blob = new Blob([bytes], { type: value.content_type || 'application/octet-stream' });
      form.append(name, blob, value.filename || 'upload.bin');
    } else if (Array.isArray(value)) {
      for (const entry of value) form.append(name, typeof entry === 'object' ? JSON.stringify(entry) : String(entry));
    } else if (value !== undefined && value !== null) {
      form.append(name, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  }
  return form;
}

export async function executeOperation({
  operation_id,
  path_params,
  query,
  body,
  multipart,
  raw_body_base64,
  content_type,
  headers: extraHeaders,
}) {
  const token = process.env.HOSTINGER_API_TOKEN;
  if (!token) throw new Error('HOSTINGER_API_TOKEN is not configured on the bridge.');

  const found = await findOperation(operation_id);
  const { spec, operation, method, path } = found;
  const actualPath = applyPathParams(path, path_params, found);
  const baseUrl = operation.servers?.[0]?.url || spec.servers?.[0]?.url || FALLBACK_BASE_URL;
  const url = new URL(actualPath, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  appendQuery(url, query);

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...sanitizeExtraHeaders(extraHeaders),
  };

  const init = { method, headers, redirect: 'follow' };

  if (multipart && typeof multipart === 'object') {
    init.body = buildMultipart(multipart);
  } else if (raw_body_base64) {
    init.body = Buffer.from(raw_body_base64, 'base64');
    headers['Content-Type'] = content_type || 'application/octet-stream';
  } else if (body !== undefined && body !== null && !['GET', 'HEAD'].includes(method)) {
    init.body = JSON.stringify(body);
    headers['Content-Type'] = content_type || 'application/json';
  }

  const response = await fetch(url, init);
  const responseContentType = response.headers.get('content-type') || '';
  let payload;

  if (response.status === 204) {
    payload = null;
  } else if (responseContentType.includes('application/json')) {
    payload = await response.json().catch(async () => ({ raw: await response.text() }));
  } else {
    const text = await response.text();
    payload = text.length > 100000
      ? { truncated: true, first_100000_chars: text.slice(0, 100000) }
      : text;
  }

  return {
    ok: response.ok,
    status: response.status,
    operation_id,
    method,
    url: url.toString(),
    correlation_id: response.headers.get('x-correlation-id') || response.headers.get('correlation-id'),
    retry_after: response.headers.get('retry-after'),
    content_type: responseContentType,
    data: payload,
  };
}

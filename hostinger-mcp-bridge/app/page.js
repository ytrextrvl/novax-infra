export const dynamic = 'force-dynamic';

export default function Home() {
  const tokenConfigured = Boolean(process.env.HOSTINGER_API_TOKEN);
  const secretConfigured = Boolean(process.env.BRIDGE_ADMIN_SECRET && process.env.BRIDGE_ADMIN_SECRET.length >= 16);
  const ready = tokenConfigured && secretConfigured;

  return (
    <main style={{ maxWidth: 760, margin: '8vh auto', padding: 24 }}>
      <section style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 8px 30px #00000012' }}>
        <h1 style={{ marginTop: 0 }}>Hostinger MCP Bridge</h1>
        <p>This private bridge exposes the official Hostinger API to ChatGPT through MCP while keeping the Hostinger API token in Vercel environment variables.</p>
        <p><strong>Status:</strong> {ready ? 'READY' : 'SETUP REQUIRED'}</p>
        <ul>
          <li>HOSTINGER_API_TOKEN: {tokenConfigured ? 'configured' : 'missing'}</li>
          <li>BRIDGE_ADMIN_SECRET: {secretConfigured ? 'configured' : 'missing or too short'}</li>
        </ul>
        <p><strong>MCP endpoint:</strong> <code>/api/mcp</code></p>
        <p>The bridge exposes three tools: search the Hostinger API catalog, inspect an operation, and execute an official Hostinger API operation.</p>
      </section>
    </main>
  );
}

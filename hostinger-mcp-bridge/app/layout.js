export const metadata = {
  title: 'Hostinger MCP Bridge',
  description: 'Private Hostinger API bridge for ChatGPT MCP',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#f6f7f9', color: '#111827' }}>
        {children}
      </body>
    </html>
  );
}

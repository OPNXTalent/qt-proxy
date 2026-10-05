import { publicClientConfig } from './preview-database-isolation.js';

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  try {
    // Escape script-sensitive characters even though the schema is restrictive.
    const config = JSON.stringify(publicClientConfig()).replace(/</g, '\\u003c');
    return res.status(200).end(`window.PRISM_PUBLIC_CONFIG = Object.freeze(${config});`);
  } catch {
    return res.status(503).end('window.PRISM_PUBLIC_CONFIG = null;');
  }
}

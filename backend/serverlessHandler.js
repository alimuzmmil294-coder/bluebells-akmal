import app from './app.js';
import { startup } from './server.js';

export default async function handler(req, res) {
  try {
    await startup;
  } catch (err) {
    console.error('[Serverless] Startup failed:', err?.message || err);
    return res.status(503).json({
      success: false,
      error: 'Backend initialization failed.'
    });
  }

  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads') && req.url !== '/') {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
}

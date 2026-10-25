import http from 'node:http';
import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './scripts/seed.js';
import Product from './models/Product.js';

dotenv.config();

const server = http.createServer(app);

// HTTP socket optimization for high-concurrency throughput
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.maxHeadersCount = 100;
server.requestTimeout = 30000;

const startup = (async () => {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      throw new Error('SESSION_SECRET must be configured with at least 32 characters in production.');
    }
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured in production.');
    }
  }

  await connectDB();

  try {
    const { removeDemoSeedData } = await import('./services/demoDataCleanup.js');
    await removeDemoSeedData();
  } catch (cleanupErr) {
    console.warn('[Server] Demo cleanup error:', cleanupErr.message);
  }

  try {
    const count = await Product.countDocuments({});
    if (count === 0) {
      await seedDatabase();
    }
  } catch (seedingError) {
    console.warn('[Server] Seed check failed:', seedingError.message);
  }
})();

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  startup.then(() => {
    server.listen(PORT, () => {
      console.log(`[Server] BlueBells backend running on port ${PORT}`);
    });
  });
}

export { app, server, startup };
export default app;

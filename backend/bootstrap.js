import { connectDB } from './config/db.js';
import { ensureAdminAndSettings } from './scripts/seed.js';

let bootstrapPromise;

export async function initializeBackend() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      if (process.env.NODE_ENV === 'production') {
        if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
          throw new Error('SESSION_SECRET must be configured with at least 32 characters in production.');
        }
        if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
          throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured in production.');
        }
        if (!process.env.CLIENT_URL) {
          process.env.CLIENT_URL = 'https://bluebells-akmal-5st6.vercel.app';
        }
      }

      await connectDB();
      await ensureAdminAndSettings();
    })();
  }

  try {
    await bootstrapPromise;
  } catch (err) {
    bootstrapPromise = null;
    throw err;
  }
}

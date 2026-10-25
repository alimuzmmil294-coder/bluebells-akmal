import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is missing. It must be explicitly configured with at least 32 characters in production.');
  }
  return 'bluebells_development_session_secret_only';
}

export function createSessionMiddleware() {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = getSessionSecret();
  if (isProduction && (!secret || secret.length < 32)) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters in production.');
  }

  const store = MongoStore.create({
    clientPromise: new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) {
        resolve(mongoose.connection.getClient());
      } else {
        mongoose.connection.once('connected', () => {
          resolve(mongoose.connection.getClient());
        });
      }
    }),
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native',
    crypto: {
      secret: secret
    }
  });

  return session({
    name: 'bluebells.sid',
    secret: secret,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days in ms
    }
  });
}

export default createSessionMiddleware;

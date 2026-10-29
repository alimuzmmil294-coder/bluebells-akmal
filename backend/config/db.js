import { mkdtemp, mkdir, rm, statfs } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let memoryServer = null;
let memoryDbPath = null;
let connectionPromise = null;
const MIN_MEMORY_DB_FREE_BYTES = 1024 ** 3;

async function getMemoryDatabaseRoot() {
  const candidates = [];
  const configuredRoot = process.env.MONGODB_MEMORY_DIR?.trim();
  if (configuredRoot) {
    candidates.push({ path: configuredRoot, createPath: true });
  }
  candidates.push({ path: os.tmpdir(), createPath: false });

  if (process.platform === 'win32') {
    for (let letter = 67; letter <= 90; letter += 1) {
      candidates.push({ path: `${String.fromCharCode(letter)}:\\`, createPath: false, driveRoot: true });
    }
  }

  const checked = new Set();
  const insufficient = [];
  for (const candidate of candidates) {
    const key = path.resolve(candidate.path).toLowerCase();
    if (checked.has(key)) continue;
    checked.add(key);

    try {
      if (candidate.createPath) {
        await mkdir(candidate.path, { recursive: true });
      }
      const { bavail, bsize } = await statfs(candidate.path);
      const freeBytes = bavail * bsize;
      if (freeBytes < MIN_MEMORY_DB_FREE_BYTES) {
        insufficient.push(`${candidate.path} (${(freeBytes / 1024 ** 3).toFixed(2)} GB free)`);
        continue;
      }

      const root = candidate.driveRoot
        ? path.join(candidate.path, 'BlueBells', 'mongodb-memory')
        : candidate.path;
      await mkdir(root, { recursive: true });
      console.log(`[DB] Using temporary MongoDB storage at ${root} (${(freeBytes / 1024 ** 3).toFixed(2)} GB free).`);
      return root;
    } catch (err) {
      insufficient.push(`${candidate.path} (${err.message})`);
    }
  }

  throw new Error(
    `No writable temporary location has at least 1 GB free for the development MongoDB. Set MONGODB_MEMORY_DIR to a writable location. Checked: ${insufficient.join('; ')}`
  );
}

async function cleanupMemoryDatabase() {
  const cleanupErrors = [];
  const server = memoryServer;
  const dbPath = memoryDbPath;
  memoryServer = null;
  memoryDbPath = null;

  if (server) {
    try {
      await server.stop();
    } catch (err) {
      cleanupErrors.push(err);
    }
  }
  if (dbPath) {
    try {
      await rm(dbPath, { recursive: true, force: true });
    } catch (err) {
      cleanupErrors.push(err);
    }
  }
  if (cleanupErrors.length) {
    throw new AggregateError(cleanupErrors, 'Failed to clean up the temporary MongoDB database.');
  }
}

mongoose.connection.on('disconnected', () => {
  connectionPromise = null;
});

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = connect();
  try {
    return await connectionPromise;
  } catch (err) {
    connectionPromise = null;
    throw err;
  }
}

async function connect() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bluebells';

  const mongooseOptions = {
    maxPoolSize: 150, // Scaled connection pool to handle high-traffic parallel queries
    minPoolSize: 15,  // Pre-warmed socket connections to avoid cold-start latency during traffic spikes
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    console.log(`[DB] Attempting connection to MongoDB at: ${uri.replace(/:[^:]*@/, ':****@')}`);
    await mongoose.connect(uri, mongooseOptions);
    console.log(`[DB] MongoDB successfully connected to database: ${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[DB] Production database connection failed; refusing to use ephemeral storage.');
      throw err;
    }

    console.warn(`[DB] Could not connect to primary MongoDB URI (${err.message}). Initializing fallback MongoMemoryServer for development/testing...`);
    try {
      const memoryRoot = await getMemoryDatabaseRoot();
      memoryDbPath = await mkdtemp(path.join(memoryRoot, 'bluebells-mongodb-'));
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbPath: memoryDbPath,
          args: ['--wiredTigerCacheSizeGB=0.5']
        }
      });
      const memUri = memoryServer.getUri();
      console.log(`[DB] MongoMemoryServer running at: ${memUri}`);
      await mongoose.connect(memUri, mongooseOptions);
      console.log('[DB] Connected to embedded in-memory database successfully.');
      return mongoose.connection;
    } catch (fallbackErr) {
      let cleanupMessage = '';
      try {
        await cleanupMemoryDatabase();
      } catch (cleanupErr) {
        cleanupMessage = ` Cleanup also failed: ${cleanupErr.message}`;
      }
      const error = new Error(
        `[DB] Could not establish MongoDB connection or start the development fallback: ${fallbackErr.message}.${cleanupMessage}`,
        { cause: fallbackErr }
      );
      console.error(error.message);
      throw error;
    }
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    await cleanupMemoryDatabase();
    console.log('[DB] Disconnected from MongoDB');
  } catch (err) {
    console.error('[DB] Error disconnecting MongoDB:', err.message);
  }
}

export default { connectDB, disconnectDB };

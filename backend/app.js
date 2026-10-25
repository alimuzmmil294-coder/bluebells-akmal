import path from "node:path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import signature from "cookie-signature";
import { connectDB } from "./config/db.js";
import { createSessionMiddleware, getSessionSecret } from "./config/session.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { responseCompression } from "./middleware/compression.js";
import {
  trafficThrottler,
  getTrafficMetrics,
} from "./middleware/trafficThrottler.js";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

/**
 * Safely parse a URL string into its origin.
 * Uses try / catch so invalid or malformed env variables never crash the application on boot.
 */
export function getSafeOrigin(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    console.warn(`[Config] Ignored invalid client origin URL: "${trimmed}"`);
    return null;
  }
}

/**
 * Build the set of allowed origins for CORS.
 */
export function getAllowedOrigins() {
  const origins = new Set([
    "https://bluebells-akmal-5st6.vercel.app",
    "https://bluebells-vv44.vercel.app",
  ]);

  if (!isProduction) {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
  }

  const rawOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.CLIENT_URLS || "").split(","),
  ];

  for (const raw of rawOrigins) {
    const safe = getSafeOrigin(raw);
    if (safe) {
      origins.add(safe);
    }
  }

  return origins;
}

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  return getAllowedOrigins().has(origin);
}

const app = express();

if (isProduction) {
  app.set("trust proxy", 1);
}

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);

// CORS configuration
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  }),
);

// Handle preflight requests
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

// Logging (omitted in test suite)
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Static uploads serving
app.use(["/uploads", "/api/uploads"], express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});

// High-traffic protection: Concurrency throttling, load-shedding, and response compression
app.use(trafficThrottler);
app.use(responseCompression);
app.use("/api", generalLimiter);

// Ensure database connection is active before processing requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Bearer token to signed session cookie bridge
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const secret = getSessionSecret();
      if (secret) {
        const signed = "s:" + signature.sign(token, secret);
        const existingCookie = req.headers.cookie;
        if (!existingCookie || !existingCookie.includes("bluebells.sid=")) {
          req.headers.cookie = existingCookie
            ? `${existingCookie}; bluebells.sid=${encodeURIComponent(signed)}`
            : `bluebells.sid=${encodeURIComponent(signed)}`;
        }
      }
    }
  }
  next();
});

// Session middleware
app.use(createSessionMiddleware());

// Base health and root routes
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BlueBells API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    dbState: "connected",
  });
});

app.get("/api/traffic-status", (req, res) => {
  res.status(200).json({ success: true, metrics: getTrafficMetrics() });
});

// Feature API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingRoutes);

// Route aliases
app.get("/api/brands", (req, res) => res.redirect("/api/products/brands"));
app.get("/api/categories", (req, res) =>
  res.redirect("/api/products/categories"),
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;

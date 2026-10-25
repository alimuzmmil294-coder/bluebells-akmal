import zlib from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(zlib.gzip);
const deflateAsync = promisify(zlib.deflate);

/**
 * High-performance asynchronous response compression middleware using native node:zlib.
 * Handles Gzip and Deflate encoding asynchronously on worker threads for JSON and text payloads > 1KB.
 * Ensures the Node.js single-threaded event loop is never blocked by CPU-intensive compression.
 */
export function responseCompression(req, res, next) {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Skip compression for OPTIONS or if client does not accept gzip/deflate
  if (req.method === 'OPTIONS' || !acceptEncoding) {
    return next();
  }

  const supportsGzip = acceptEncoding.includes('gzip');
  const supportsDeflate = acceptEncoding.includes('deflate');

  if (!supportsGzip && !supportsDeflate) {
    return next();
  }

  const selectedEncoding = supportsGzip ? 'gzip' : 'deflate';
  const compressAsync = supportsGzip ? gzipAsync : deflateAsync;

  const originalSend = res.send;
  const originalJson = res.json;

  res.json = function (body) {
    const jsonString = JSON.stringify(body);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(jsonString);
  };

  res.send = function (body) {
    if (res.headersSent) {
      return originalSend.call(this, body);
    }

    res.setHeader('Vary', 'Accept-Encoding');

    // Only compress strings or buffers that exceed 1KB
    const isBuffer = Buffer.isBuffer(body);
    const isString = typeof body === 'string';

    if (!isBuffer && !isString) {
      return originalSend.call(this, body);
    }

    const byteLength = isBuffer ? body.length : Buffer.byteLength(body, 'utf-8');

    if (byteLength < 1024) {
      return originalSend.call(this, body);
    }

    const bufferToCompress = isBuffer ? body : Buffer.from(body, 'utf-8');

    compressAsync(bufferToCompress, {
      level: zlib.constants.Z_BEST_SPEED // Optimized for maximum throughput and minimum CPU latency
    })
      .then((compressed) => {
        if (res.headersSent) return;
        res.setHeader('Content-Encoding', selectedEncoding);
        res.removeHeader('Content-Length');
        res.setHeader('Content-Length', compressed.length);
        originalSend.call(this, compressed);
      })
      .catch((compressErr) => {
        // Graceful fallback to uncompressed payload if compression encounters an issue
        console.warn('[Compression] Fallback to raw response:', compressErr.message);
        if (!res.headersSent) {
          originalSend.call(this, body);
        }
      });

    return res;
  };

  next();
}

export default responseCompression;

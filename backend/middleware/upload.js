import fs from 'node:fs';
import path from 'node:path';

const uploadsDir = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem in serverless environments (e.g., Vercel)
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const EXT_MAP = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return 'image/png';
  }
  // WEBP: 'RIFF' .... 'WEBP'
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Native Node.js multipart/form-data parser with strict validation & serverless fallback.
 */
export async function handleFileUpload(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost';
    const fullUrl = `${protocol}://${host}${req.url}`;

    const webReq = new Request(fullUrl, {
      method: req.method,
      headers: req.headers,
      body: buffer
    });

    const formData = await webReq.formData();
    const uploadedFiles = [];
    const fields = {};

    for (const [key, value] of formData.entries()) {
      if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function' && value.name) {
        // It's a file
        if (value.size > 0) {
          const rawExt = path.extname(value.name).toLowerCase();

          // Reject disallowed extensions explicitly
          if (!ALLOWED_EXTENSIONS.has(rawExt)) {
            return res.status(400).json({
              success: false,
              error: `Invalid file extension "${rawExt}". Only JPEG, PNG, and WebP images are allowed.`
            });
          }

          const arrayBuffer = await value.arrayBuffer();
          const fileBuffer = Buffer.from(arrayBuffer);

          // Verify Magic Bytes
          const detectedMime = validateImageMagicBytes(fileBuffer);
          if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
            return res.status(400).json({
              success: false,
              error: `Invalid or unsafe file content for "${value.name}". File must be a valid JPEG, PNG, or WebP image.`
            });
          }

          const safeExt = EXT_MAP[detectedMime] || '.jpg';
          const safeBaseName = path.basename(value.name, rawExt).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
          const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safeBaseName}${safeExt}`;

          let publicUrl;
          let writeSuccess = false;

          // Attempt writing to disk if not in read-only environment
          try {
            if (!process.env.VERCEL) {
              const diskPath = path.join(uploadsDir, uniqueFileName);
              fs.writeFileSync(diskPath, fileBuffer);
              publicUrl = `/uploads/${uniqueFileName}`;
              writeSuccess = true;
            }
          } catch (writeErr) {
            console.warn('[Upload] Local disk write failed, falling back to Data URI:', writeErr.message);
          }

          // Fallback to Data URI for serverless or read-only environments
          if (!writeSuccess) {
            publicUrl = `data:${detectedMime};base64,${fileBuffer.toString('base64')}`;
          }

          uploadedFiles.push({
            originalName: value.name,
            fileName: uniqueFileName,
            mimeType: detectedMime,
            size: value.size,
            path: publicUrl
          });
        }
      } else {
        // Regular form field
        if (fields[key] === undefined) {
          fields[key] = value;
        } else if (Array.isArray(fields[key])) {
          fields[key].push(value);
        } else {
          fields[key] = [fields[key], value];
        }
      }
    }

    // Auto-parse JSON string fields if applicable
    const jsonFields = ['variants', 'storageOptions', 'colors', 'specifications', 'gallery', 'existingImages'];
    for (const jField of jsonFields) {
      if (typeof fields[jField] === 'string') {
        try {
          fields[jField] = JSON.parse(fields[jField]);
        } catch (e) {
          // keep as string if not valid JSON
        }
      }
    }

    // Cast numeric and boolean fields
    if (fields.price !== undefined) fields.price = Number(fields.price);
    if (fields.stock !== undefined) fields.stock = Number(fields.stock);
    if (fields.originalPrice !== undefined) fields.originalPrice = Number(fields.originalPrice);
    if (fields.costPrice !== undefined) fields.costPrice = Number(fields.costPrice);
    if (fields.featured !== undefined) fields.featured = String(fields.featured) === 'true';
    let combinedGallery = [];
    if (Array.isArray(fields.existingImages) && fields.existingImages.length > 0) {
      combinedGallery.push(...fields.existingImages);
    }
    if (uploadedFiles.length > 0) {
      combinedGallery.push(...uploadedFiles.map((f) => f.path));
    }
    if (combinedGallery.length > 0) {
      fields.gallery = combinedGallery.slice(0, 3);
      fields.image = fields.gallery[0];
    } else if (fields.image && !fields.gallery) {
      fields.gallery = [fields.image];
    }

    req.body = { ...req.body, ...fields };
    req.files = uploadedFiles;

    next();
  } catch (err) {
    console.error('[Upload Middleware Error]:', err);
    res.status(400).json({
      success: false,
      error: 'Failed to process multipart form-data upload: ' + err.message
    });
  }
}

export default handleFileUpload;

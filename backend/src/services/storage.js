import path from 'path';
import { randomUUID } from 'crypto';
import { uploadBuffer as s3UploadBuffer, uploadBufferDynamic, rewriteStorageUrlForBrowser } from './s3.js';
import { getStorageSettings } from './settings.js';
import { uploadToCdn } from './cdn-upload.js';
import { optimizeImage } from './imageOptimize.js';

/**
 * Build an object-storage key for a single file.
 * e.g. "uploads/2026/<uuid>.jpg"
 */
function buildKey(filename) {
  const ext = path.extname(filename || '');
  return `uploads/${new Date().getUTCFullYear()}/${randomUUID()}${ext}`;
}

/**
 * Build a key that shares the same UUID across formats.
 * Returns a factory so callers can append the desired extension.
 * e.g. baseKeyFactory('.avif') → "uploads/2026/<uuid>.avif"
 */
function makeBaseKeyFactory() {
  const uuid = randomUUID();
  const year = new Date().getUTCFullYear();
  return (ext) => `uploads/${year}/${uuid}${ext}`;
}

export async function resolveStorageProvider() {
  const settings = await getStorageSettings();
  if (settings.provider === 'minio' || settings.minioEnabled) return 'minio';
  if (settings.provider === 's3') return 's3';
  if (settings.provider === 'cdn') return 'cdn';
  return 'disk';
}

/**
 * Upload a single buffer to whichever remote provider is configured.
 * Returns the raw (pre-rewrite) public URL, or null on failure.
 *
 * @param {object} settings  - Storage settings from getStorageSettings()
 * @param {string} key       - Object key (e.g. "uploads/2026/uuid.avif")
 * @param {Buffer} buffer    - File bytes
 * @param {string} mimetype  - MIME type
 * @param {object} [file]    - Original file object (needed for CDN provider)
 */
async function uploadOne(settings, key, buffer, mimetype, file) {
  if (settings.provider === 'minio' || settings.minioEnabled) {
    const url = await s3UploadBuffer(key, buffer, mimetype);
    if (!url) throw new Error('MinIO upload failed');
    return url;
  }
  if (settings.provider === 's3') {
    return await uploadBufferDynamic(settings, key, buffer, mimetype);
  }
  if (settings.provider === 'cdn') {
    const fileArg = { ...(file || {}), buffer, mimetype, key };
    return await uploadToCdn(settings, fileArg);
  }
  return null; // disk provider — handled separately
}

/**
 * Upload a file to the configured storage provider.
 *
 * For image files (JPEG, PNG, WebP, AVIF, TIFF, BMP):
 *   - Generates three formats in parallel: AVIF, WebP, JPEG
 *   - Uploads all three to storage under the same UUID, different extensions
 *   - Stores the JPEG URL as imageUrl in the database (universal fallback)
 *   - The frontend derives AVIF/WebP URLs by swapping ".jpg" → ".avif"/".webp"
 *     (this convention only applies to URLs ending in .jpg from our pipeline)
 *
 * For non-image files:
 *   - Uploaded as-is (single file, original extension).
 *
 * @param {object} file - multer file object (buffer, mimetype, originalname)
 * @returns {Promise<string>} Public URL (rewritten for browser access)
 */
export async function uploadFileBySettings(file) {
  const settings = await getStorageSettings();

  // ── Image path: generate AVIF + WebP + JPEG and upload in parallel ──────
  const optimized = await optimizeImage(file.buffer, file.mimetype);

  if (optimized) {
    const { avif, webp, jpeg, avifSm, webpSm, jpegSm } = optimized;
    const key = makeBaseKeyFactory();

    if (settings.provider === 'minio' || settings.minioEnabled || settings.provider === 's3') {
      // Parallel upload of all six formats (desktop + mobile) — minimises total upload time.
      // Mobile variants use "-sm" suffix before the extension, e.g. uuid-sm.avif
      const [jpegUrl] = await Promise.all([
        uploadOne(settings, key('.jpg'),      jpeg,   'image/jpeg', file),
        uploadOne(settings, key('.webp'),     webp,   'image/webp',  file),
        uploadOne(settings, key('.avif'),     avif,   'image/avif',  file),
        uploadOne(settings, key('-sm.jpg'),   jpegSm, 'image/jpeg', file),
        uploadOne(settings, key('-sm.webp'),  webpSm, 'image/webp',  file),
        uploadOne(settings, key('-sm.avif'),  avifSm, 'image/avif',  file),
      ]);
      return rewriteStorageUrlForBrowser(jpegUrl);
    }

    // CDN provider: single-format upload only (CDN API usually takes one file)
    if (settings.provider === 'cdn') {
      const url = await uploadOne(settings, key('.jpg'), jpeg, 'image/jpeg', file);
      return rewriteStorageUrlForBrowser(url);
    }
  }

  // ── Fallback: non-image file or sharp failure — upload original ──────────
  if (settings.provider === 'minio' || settings.minioEnabled || settings.provider === 's3' || settings.provider === 'cdn') {
    const rawKey = buildKey(file.originalname);
    const url = await uploadOne(settings, rawKey, file.buffer, file.mimetype || 'application/octet-stream', file);
    return rewriteStorageUrlForBrowser(url);
  }

  throw new Error('No remote storage provider is configured');
}

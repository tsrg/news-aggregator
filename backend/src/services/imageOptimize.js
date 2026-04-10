import sharp from 'sharp';

/**
 * MIME types that we process through sharp.
 * GIF is excluded — animated GIFs would lose animation.
 */
const SUPPORTED_INPUT = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/tiff',
  'image/bmp',
]);

/**
 * Maximum width for desktop images.
 * News thumbnails are displayed at most ~800 px wide on desktop.
 * 1200 px gives 1.5× headroom for retina displays without wasting storage.
 */
const MAX_WIDTH = 1200;

/**
 * Maximum width for mobile images.
 * On phones the card is full-width (~390 px); 420 px covers retina at 1×.
 */
const MAX_WIDTH_SM = 420;

/**
 * Optimise an uploaded image into six variants for use with <picture> + srcset.
 *
 * Desktop (1200 px):
 *   AVIF  quality 65 → ~50–130 KB
 *   WebP  quality 82 → ~80–180 KB
 *   JPEG  quality 85 → ~120–300 KB  ← imageUrl stored in DB
 *
 * Mobile (420 px, suffix -sm):
 *   AVIF  quality 65 → ~10–35 KB
 *   WebP  quality 82 → ~15–50 KB
 *   JPEG  quality 85 → ~25–80 KB
 *
 * Storage key convention (all share the same UUID):
 *   uploads/2026/<uuid>.avif      uploads/2026/<uuid>-sm.avif
 *   uploads/2026/<uuid>.webp      uploads/2026/<uuid>-sm.webp
 *   uploads/2026/<uuid>.jpg  ←DB  uploads/2026/<uuid>-sm.jpg
 *
 * The frontend derives all URLs from the JPEG imageUrl by swapping extensions
 * and inserting "-sm" before ".jpg" — only when the URL ends with ".jpg".
 *
 * @param {Buffer} buffer   - Raw file bytes
 * @param {string} mimetype - MIME type from multer (e.g. "image/jpeg")
 * @returns {Promise<{ avif: Buffer, webp: Buffer, jpeg: Buffer,
 *                     avifSm: Buffer, webpSm: Buffer, jpegSm: Buffer }|null>}
 *   Returns null if the mimetype is not supported or sharp fails.
 */
export async function optimizeImage(buffer, mimetype) {
  const type = (mimetype || '').toLowerCase();

  if (!SUPPORTED_INPUT.has(type)) {
    return null; // not an image we handle
  }

  try {
    // Decode and auto-rotate once; branch into two size pipelines.
    const decoded = sharp(buffer).rotate();

    const desktop = decoded.clone().resize({ width: MAX_WIDTH,    withoutEnlargement: true });
    const mobile  = decoded.clone().resize({ width: MAX_WIDTH_SM, withoutEnlargement: true });

    // All six encodings run in parallel to minimise latency.
    const [avif, webp, jpeg, avifSm, webpSm, jpegSm] = await Promise.all([
      desktop.clone().avif({ quality: 65, effort: 4 }).toBuffer(),
      desktop.clone().webp({ quality: 82, effort: 4 }).toBuffer(),
      desktop.clone().jpeg({ quality: 85, progressive: true }).toBuffer(),
      mobile.clone().avif({ quality: 65, effort: 4 }).toBuffer(),
      mobile.clone().webp({ quality: 82, effort: 4 }).toBuffer(),
      mobile.clone().jpeg({ quality: 85, progressive: true }).toBuffer(),
    ]);

    return { avif, webp, jpeg, avifSm, webpSm, jpegSm };
  } catch (err) {
    // Non-fatal: log and signal caller to upload original
    console.warn('[imageOptimize] sharp failed, uploading original:', err.message);
    return null;
  }
}

import path from 'path';
import { randomUUID } from 'crypto';
import { uploadBuffer as s3UploadBuffer, rewriteStorageUrlForBrowser } from './s3.js';
import { getStorageSettings } from './settings.js';
import { uploadToCdn } from './cdn-upload.js';

function buildKey(originalName) {
  const ext = path.extname(originalName || '');
  return `uploads/${new Date().getUTCFullYear()}/${randomUUID()}${ext}`;
}

export async function resolveStorageProvider() {
  const settings = await getStorageSettings();
  if (settings.minioEnabled) return 'minio';
  if (settings.provider === 'cdn') return 'cdn';
  return 'disk';
}

export async function uploadFileBySettings(file) {
  const settings = await getStorageSettings();
  const key = buildKey(file.originalname);

  let url;
  if (settings.minioEnabled) {
    url = await s3UploadBuffer(key, file.buffer, file.mimetype || 'application/octet-stream');
    if (!url) throw new Error('MinIO upload failed');
  } else if (settings.provider === 'cdn') {
    url = await uploadToCdn(settings, { ...file, key });
  } else {
    throw new Error('No remote storage provider is configured');
  }

  return rewriteStorageUrlForBrowser(url);
}

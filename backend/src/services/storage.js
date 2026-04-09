import path from 'path';
import { randomUUID } from 'crypto';
import { uploadBuffer as s3UploadBuffer, uploadBufferDynamic, rewriteStorageUrlForBrowser } from './s3.js';
import { getStorageSettings } from './settings.js';
import { uploadToCdn } from './cdn-upload.js';

function buildKey(originalName) {
  const ext = path.extname(originalName || '');
  return `uploads/${new Date().getUTCFullYear()}/${randomUUID()}${ext}`;
}

export async function resolveStorageProvider() {
  const settings = await getStorageSettings();
  if (settings.provider === 'minio' || settings.minioEnabled) return 'minio';
  if (settings.provider === 's3') return 's3';
  if (settings.provider === 'cdn') return 'cdn';
  return 'disk';
}

export async function uploadFileBySettings(file) {
  const settings = await getStorageSettings();
  const key = buildKey(file.originalname);

  let url;

  if (settings.provider === 'minio' || settings.minioEnabled) {
    // MinIO через переменные окружения (Docker-деплой)
    url = await s3UploadBuffer(key, file.buffer, file.mimetype || 'application/octet-stream');
    if (!url) throw new Error('MinIO upload failed');
  } else if (settings.provider === 's3') {
    // S3-совместимое хранилище с учётными данными из БД (Beget CDN, Yandex Cloud, etc.)
    url = await uploadBufferDynamic(settings, key, file.buffer, file.mimetype || 'application/octet-stream');
  } else if (settings.provider === 'cdn') {
    // Произвольный HTTP CDN API
    url = await uploadToCdn(settings, { ...file, key });
  } else {
    throw new Error('No remote storage provider is configured');
  }

  return rewriteStorageUrlForBrowser(url);
}

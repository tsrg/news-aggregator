import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { config } from '../config/index.js';

let client = null;

function getClient() {
  if (!config.s3.enabled) return null;
  if (client) return client;
  const { endpoint, forcePathStyle } = config.s3;
  // MinIO default credentials when endpoint is set and no AWS keys provided
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || (endpoint ? 'minioadmin' : undefined);
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || (endpoint ? 'minioadmin' : undefined);
  client = new S3Client({
    region: config.s3.region,
    ...(endpoint && {
      endpoint,
      forcePathStyle,
    }),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return client;
}

/**
 * Анонимное чтение объектов (GET в браузере). Без этого MinIO отдаёт 403 на публичный URL.
 */
async function ensureBucketPublicReadPolicy(client, bucket) {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  };
  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(policy),
    })
  );
}

/**
 * Ensure the configured bucket exists; create it if missing.
 * Safe to call before each upload (idempotent).
 */
export async function ensureBucketExists() {
  const c = getClient();
  if (!c) return;
  const bucket = config.s3.bucket;
  try {
    await c.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      await c.send(new CreateBucketCommand({ Bucket: bucket }));
    } else {
      throw err;
    }
  }
  if (config.s3.endpoint) {
    try {
      await ensureBucketPublicReadPolicy(c, bucket);
    } catch (e) {
      console.warn('[s3] bucket public read policy:', e.message || e);
    }
  }
}

/**
 * Подменяет внутренний S3 endpoint (Docker: http://minio:9000/bucket) на публичный
 * (S3_PUBLIC_BASE_URL), иначе браузер не откроет картинку по сохранённому URL.
 *
 * Дополнительно: любой URL с хостом minio (Docker DNS) переписывается — даже если
 * префикс не совпал с S3_ENDPOINT из .env или публичный base не задан (fallback localhost).
 */
export function rewriteStorageUrlForBrowser(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return url;

  const publicBaseRaw = (config.s3.publicBaseUrl || process.env.S3_PUBLIC_BASE_URL || '').trim();
  const publicBase = publicBaseRaw.replace(/\/$/, '');
  const ep = (config.s3.endpoint || '').trim().replace(/\/$/, '');
  const bucket = (config.s3.bucket || '').trim();

  // URL сохранён с dev-дефолтом compose (localhost:9000) — переписать на публичный base
  if (publicBaseRaw && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const pb = new URL(publicBaseRaw.includes('://') ? publicBaseRaw : `http://${publicBaseRaw}`);
      return `${pb.origin}${u.pathname}${u.search}${u.hash}`;
    } catch {
      /* fall through */
    }
  }

  // Совпадение origin с S3_ENDPOINT (надёжнее строкового префикса при path-style URL)
  if (publicBaseRaw && ep) {
    try {
      const u = new URL(trimmed);
      const epUrl = new URL(ep.includes('://') ? ep : `http://${ep}`);
      if (u.origin === epUrl.origin) {
        const pb = new URL(publicBaseRaw.includes('://') ? publicBaseRaw : `http://${publicBaseRaw}`);
        return `${pb.origin}${u.pathname}${u.search}${u.hash}`;
      }
    } catch {
      /* continue */
    }
  }

  if (publicBase && ep && bucket) {
    const internalPrefix = `${ep}/${bucket}`;
    if (trimmed.startsWith(internalPrefix)) {
      return `${publicBase}${trimmed.slice(internalPrefix.length)}`;
    }
  }

  // Хост minio (Docker DNS) — даже если S3_ENDPOINT в .env не совпал со строкой в БД
  if (/^https?:\/\/minio(:\d+)?\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      if (publicBaseRaw) {
        const pb = new URL(publicBaseRaw.includes('://') ? publicBaseRaw : `http://${publicBaseRaw}`);
        return `${pb.origin}${u.pathname}${u.search}${u.hash}`;
      }
    } catch {
      /* fall through */
    }
    return trimmed.replace(/^https?:\/\/minio(:\d+)?(?=\/|$)/i, (_, port) => `http://localhost${port || ':9000'}`);
  }

  return url;
}

/**
 * Upload a buffer to S3 and return the public URL.
 * @param {string} key - Object key (e.g. "uploads/2025/uuid.jpg")
 * @param {Buffer} buffer - File content
 * @param {string} contentType - MIME type
 * @returns {Promise<string|null>} Public URL or null if S3 disabled
 */
export async function uploadBuffer(key, buffer, contentType) {
  const c = getClient();
  if (!c) return null;
  await ensureBucketExists();
  await c.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  const base = config.s3.publicBaseUrl
    ? config.s3.publicBaseUrl.replace(/\/$/, '')
    : config.s3.endpoint
      ? `${config.s3.endpoint}/${config.s3.bucket}`
      : null;
  if (!base) return key;
  return rewriteStorageUrlForBrowser(`${base}/${key}`);
}

import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
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
  return `${base}/${key}`;
}

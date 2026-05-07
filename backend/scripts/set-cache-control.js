#!/usr/bin/env node
/**
 * Одноразовый скрипт: проставляет CacheControl на все существующие объекты в S3/Beget.
 *
 * Запуск:
 *   node backend/scripts/set-cache-control.js
 *
 * Переменные окружения (можно передать в командной строке или через .env):
 *   S3_ENDPOINT, S3_BUCKET, S3_REGION,
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 *   S3_PUBLIC_BASE_URL (опционально)
 *
 * Или — если настройки хранятся в БД — скрипт читает их через getStorageSettings().
 */

import 'dotenv/config';
import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getStorageSettings } from '../src/services/settings.js';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const DRY_RUN = process.argv.includes('--dry-run');

async function buildClient(settings) {
  const endpoint = settings.s3Endpoint || process.env.S3_ENDPOINT;
  const region   = settings.s3Region   || process.env.S3_REGION || 'us-east-1';
  const accessKeyId     = settings.s3AccessKeyId     || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = settings.s3SecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Не заданы S3_ENDPOINT / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY. ' +
      'Передайте через env или настройте хранилище в админке.'
    );
  }

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: settings.s3ForcePathStyle ?? true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function* listAllObjects(client, bucket) {
  let continuationToken;
  do {
    const resp = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ...(continuationToken && { ContinuationToken: continuationToken }),
      })
    );
    for (const obj of resp.Contents ?? []) {
      yield obj;
    }
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);
}

async function run() {
  console.log(DRY_RUN ? '[DRY RUN] Показываю что будет сделано...' : 'Обновляю CacheControl...');

  const settings = await getStorageSettings();
  const bucket = settings.s3Bucket || process.env.S3_BUCKET;
  if (!bucket) throw new Error('Не задан S3_BUCKET');

  const client = await buildClient(settings);

  let total = 0;
  let skipped = 0;
  let updated = 0;
  let failed = 0;

  for await (const obj of listAllObjects(client, bucket)) {
    total++;
    const key = obj.Key;

    // Проверяем текущий CacheControl заголовок объекта
    let head;
    try {
      head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch (err) {
      console.error(`  ✗ HEAD ${key}: ${err.message}`);
      failed++;
      continue;
    }

    if (head.CacheControl === CACHE_CONTROL) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  → будет обновлён: ${key} (было: ${head.CacheControl ?? 'не задан'})`);
      updated++;
      continue;
    }

    // Копируем объект на себя с новым CacheControl (единственный способ обновить метаданные в S3)
    try {
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${key}`,
          Key: key,
          MetadataDirective: 'REPLACE',
          ContentType: head.ContentType,
          CacheControl: CACHE_CONTROL,
          // Сохраняем все остальные метаданные
          Metadata: head.Metadata ?? {},
        })
      );
      console.log(`  ✓ ${key}`);
      updated++;
    } catch (err) {
      console.error(`  ✗ ${key}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nИтого: ${total} объектов, обновлено: ${updated}, пропущено: ${skipped}, ошибок: ${failed}`);
}

run().catch((err) => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});

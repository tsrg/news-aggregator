import { z } from 'zod';
import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import {
  getAISettings,
  getGeneralSettings,
  getStorageSettings,
  getRegionsSettings,
  getImageGenSettings,
  updateSettings,
  GENERAL_SETTINGS_KEY,
  STORAGE_SETTINGS_KEY,
  REGIONS_SETTINGS_KEY,
  AI_IMAGE_SETTINGS_KEY,
  defaultImageGenSettings,
} from '../../services/settings.js';
import { testAIConnection } from '../../services/ai.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('settings'));

const AI_SETTINGS_KEY = 'ai_config';

const generalPutSchema = z.object({
  autoDeleteStaleUnpublishedNews: z.boolean(),
  mergeDuplicateNews: z.boolean(),
});

const storagePutSchema = z.object({
  provider: z.enum(['minio', 's3', 'cdn']),

  // S3-совместимые поля (Beget CDN, Yandex Cloud, AWS, etc.)
  s3Endpoint: z.string().optional().default(''),
  s3Region: z.string().optional().default('us-east-1'),
  s3Bucket: z.string().optional().default(''),
  s3AccessKeyId: z.string().optional().default(''),
  s3SecretAccessKey: z.string().optional().default(''),
  s3PublicBaseUrl: z.string().optional().default(''),
  s3ForcePathStyle: z.boolean().optional().default(true),

  // HTTP CDN API поля
  baseUrl: z.string().optional().default(''),
  uploadEndpoint: z.string().optional().default(''),
  httpMethod: z.enum(['POST', 'PUT']).optional().default('POST'),
  fileFieldName: z.string().optional().default('file'),
  pathFieldName: z.string().optional().default(''),
  responseUrlPath: z.string().optional().default('url'),
  responsePathPath: z.string().optional().default(''),
});

// Дефолтные настройки
const defaultAISettings = {
  aiProvider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2000,
  tavilyApiKey: '',
};

const defaultGeneralSettings = {
  autoDeleteStaleUnpublishedNews: false,
  mergeDuplicateNews: false,
};

const regionsPutSchema = z.object({
  regions: z.array(z.string().min(1)),
});

const defaultRegionsSettings = {
  regions: [process.env.NUXT_PUBLIC_REGION || 'Иваново'],
};

function buildDefaultStorageSettings() {
  const hasS3Endpoint = Boolean(process.env.S3_ENDPOINT);
  const hasAwsCredentials = Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET
  );
  const minioEnabled = hasS3Endpoint || hasAwsCredentials;
  const provider = minioEnabled ? 'minio' : 'cdn';

  return {
    provider,
    minioEnabled,
    // S3-совместимые поля
    s3Endpoint: '',
    s3Region: 'us-east-1',
    s3Bucket: '',
    s3AccessKeyId: '',
    s3SecretAccessKey: '',
    s3PublicBaseUrl: '',
    s3ForcePathStyle: true,
    // HTTP CDN API поля
    baseUrl: '',
    uploadEndpoint: '',
    httpMethod: 'POST',
    fileFieldName: 'file',
    pathFieldName: '',
    responseUrlPath: 'url',
    responsePathPath: '',
  };
}

router.get('/general', async (req, res) => {
  try {
    const settings = await getGeneralSettings();
    return res.json(settings);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/general', async (req, res) => {
  try {
    const parsed = generalPutSchema.parse(req.body);
    const current = await getGeneralSettings();
    const updated = { ...current, ...parsed };
    await updateSettings(GENERAL_SETTINGS_KEY, updated);
    return res.json(updated);
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.issues ?? e.errors });
    }
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/storage', async (req, res) => {
  try {
    const settings = await getStorageSettings();
    // Маскируем секретный ключ S3
    return res.json({
      ...settings,
      s3SecretAccessKey: settings.s3SecretAccessKey
        ? '••••••••' + String(settings.s3SecretAccessKey).slice(-4)
        : '',
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/storage', async (req, res) => {
  try {
    const parsed = storagePutSchema.parse(req.body);
    const current = await getStorageSettings();

    // Не перезаписываем секрет если пришла маска
    const secretUpdate =
      parsed.s3SecretAccessKey && !String(parsed.s3SecretAccessKey).startsWith('••••')
        ? { s3SecretAccessKey: parsed.s3SecretAccessKey }
        : {};

    const updated = {
      ...current,
      ...parsed,
      ...secretUpdate,
      // minioEnabled сохраняем синхронно с provider
      minioEnabled: parsed.provider === 'minio',
    };

    await updateSettings(STORAGE_SETTINGS_KEY, updated);

    return res.json({
      ...updated,
      s3SecretAccessKey: updated.s3SecretAccessKey
        ? '••••••••' + String(updated.s3SecretAccessKey).slice(-4)
        : '',
    });
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.issues ?? e.errors });
    }
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/regions', async (req, res) => {
  try {
    const settings = await getRegionsSettings();
    return res.json(settings);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/regions', async (req, res) => {
  try {
    const parsed = regionsPutSchema.parse(req.body);
    const normalized = Array.from(
      new Set(
        parsed.regions
          .map((r) => r.trim())
          .filter((r) => r.length > 0)
      ),
    ).slice(0, 50);

    await updateSettings(REGIONS_SETTINGS_KEY, { regions: normalized });
    const updated = await getRegionsSettings();
    return res.json(updated);
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.issues ?? e.errors });
    }
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить настройки AI
router.get('/ai', async (req, res) => {
  try {
    const settings = await getAISettings();

    const maskKey = (k) => (k ? '••••••••' + String(k).slice(-4) : '');
    return res.json({
      ...settings,
      apiKey: maskKey(settings.apiKey),
      tavilyApiKey: maskKey(settings.tavilyApiKey),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить настройки AI
router.put('/ai', async (req, res) => {
  try {
    const { aiProvider, apiKey, baseUrl, model, temperature, maxTokens, tavilyApiKey } = req.body;

    // Получаем текущие настройки
    const currentSettings = await getAISettings();

    const tavilyUpdate =
      tavilyApiKey !== undefined && !String(tavilyApiKey).startsWith('••••')
        ? { tavilyApiKey: String(tavilyApiKey).trim() }
        : {};

    // Обновляем только переданные поля
    const updatedSettings = {
      ...currentSettings,
      ...(aiProvider && { aiProvider }),
      ...(apiKey && !apiKey.startsWith('••••') && { apiKey }),
      ...(baseUrl !== undefined && { baseUrl }),
      ...(model && { model }),
      ...(temperature !== undefined && { temperature }),
      ...(maxTokens !== undefined && { maxTokens }),
      ...tavilyUpdate,
    };

    // Сохраняем в БД и сбрасываем кэш
    await updateSettings(AI_SETTINGS_KEY, updatedSettings);

    console.log('AI settings updated:', {
      provider: updatedSettings.aiProvider,
      model: updatedSettings.model,
    });

    const maskKey = (k) => (k ? '••••••••' + String(k).slice(-4) : '');
    return res.json({
      ...updatedSettings,
      apiKey: maskKey(updatedSettings.apiKey),
      tavilyApiKey: maskKey(updatedSettings.tavilyApiKey),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ai-image', async (req, res) => {
  try {
    const settings = await getImageGenSettings();
    return res.json({
      ...settings,
      apiKey: settings.apiKey ? '••••••••' + settings.apiKey.slice(-4) : '',
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const aiImagePutSchema = z.object({
  imageProvider: z.enum(['openai', 'custom', 'zai']).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
});

router.put('/ai-image', async (req, res) => {
  try {
    const parsed = aiImagePutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: parsed.error.flatten(),
      });
    }
    const { imageProvider, apiKey, baseUrl, model, size } = parsed.data;
    const current = await getImageGenSettings();
    const updated = {
      ...current,
      ...(imageProvider && { imageProvider }),
      ...(apiKey && !String(apiKey).startsWith('••••') && { apiKey: String(apiKey) }),
      ...(baseUrl !== undefined && { baseUrl: String(baseUrl) }),
      ...(model !== undefined && { model: String(model) }),
      ...(size !== undefined && { size: String(size) }),
    };
    await updateSettings(AI_IMAGE_SETTINGS_KEY, updated);
    const out = await getImageGenSettings();
    return res.json({
      ...out,
      apiKey: out.apiKey ? '••••••••' + out.apiKey.slice(-4) : '',
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Тест соединения с AI API
router.post('/ai/test', async (req, res) => {
  try {
    const { provider, apiKey, baseUrl, model } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API Key is required' });
    }

    // Используем временные настройки без сохранения в БД
    const testSettings = {
      aiProvider: provider || 'openai',
      apiKey,
      baseUrl: baseUrl || '',
      model: model || 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
    };

    // Сохраняем текущие настройки и env
    const originalEnv = {
      AI_PROVIDER: process.env.AI_PROVIDER,
      AI_API_KEY: process.env.AI_API_KEY,
      AI_BASE_URL: process.env.AI_BASE_URL,
      AI_MODEL: process.env.AI_MODEL,
      AI_TEMPERATURE: process.env.AI_TEMPERATURE,
      AI_MAX_TOKENS: process.env.AI_MAX_TOKENS,
    };

    try {
      // Временно меняем env для теста
      process.env.AI_PROVIDER = testSettings.aiProvider;
      process.env.AI_API_KEY = testSettings.apiKey;
      process.env.AI_BASE_URL = testSettings.baseUrl;
      process.env.AI_MODEL = testSettings.model;
      process.env.AI_TEMPERATURE = String(testSettings.temperature);
      process.env.AI_MAX_TOKENS = String(testSettings.maxTokens);
      
      // Тестируем соединение
      await testAIConnection();
      
      return res.json({ success: true, message: 'Соединение успешно' });
    } catch (testError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Connection failed', 
        detail: testError.message 
      });
    } finally {
      // Восстанавливаем исходные env
      process.env.AI_PROVIDER = originalEnv.AI_PROVIDER;
      process.env.AI_API_KEY = originalEnv.AI_API_KEY;
      process.env.AI_BASE_URL = originalEnv.AI_BASE_URL;
      process.env.AI_MODEL = originalEnv.AI_MODEL;
      process.env.AI_TEMPERATURE = originalEnv.AI_TEMPERATURE;
      process.env.AI_MAX_TOKENS = originalEnv.AI_MAX_TOKENS;
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error', detail: e.message });
  }
});

// Инициализация настроек при старте
export async function initializeSettings() {
  try {
    const { prisma } = await import('../../config/prisma.js');

    const existingAi = await prisma.setting.findUnique({
      where: { key: AI_SETTINGS_KEY },
    });

    if (!existingAi) {
      await prisma.setting.create({
        data: {
          key: AI_SETTINGS_KEY,
          value: defaultAISettings,
        },
      });
      console.log('Default AI settings created in database');
    } else {
      console.log('AI settings loaded from database');
    }

    const existingGeneral = await prisma.setting.findUnique({
      where: { key: GENERAL_SETTINGS_KEY },
    });

    if (!existingGeneral) {
      await prisma.setting.create({
        data: {
          key: GENERAL_SETTINGS_KEY,
          value: defaultGeneralSettings,
        },
      });
      console.log('Default general settings created in database');
    }

    const existingStorage = await prisma.setting.findUnique({
      where: { key: STORAGE_SETTINGS_KEY },
    });

    if (!existingStorage) {
      await prisma.setting.create({
        data: {
          key: STORAGE_SETTINGS_KEY,
          value: buildDefaultStorageSettings(),
        },
      });
      console.log('Default storage settings created in database');
    }

    const existingRegions = await prisma.setting.findUnique({
      where: { key: REGIONS_SETTINGS_KEY },
    });

    if (!existingRegions) {
      await prisma.setting.create({
        data: {
          key: REGIONS_SETTINGS_KEY,
          value: defaultRegionsSettings,
        },
      });
      console.log('Default regions settings created in database');
    }

    const existingAiImage = await prisma.setting.findUnique({
      where: { key: AI_IMAGE_SETTINGS_KEY },
    });

    if (!existingAiImage) {
      await prisma.setting.create({
        data: {
          key: AI_IMAGE_SETTINGS_KEY,
          value: { ...defaultImageGenSettings },
        },
      });
      console.log('Default AI image settings created in database');
    }
  } catch (e) {
    console.error('Failed to initialize settings:', e.message);
  }
}

export default router;

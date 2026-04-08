// Кэш настроек в памяти
let settingsCache = new Map();
let cacheExpiry = 0;
const CACHE_TTL = 60000; // 1 минута

// Ленивый импорт prisma для избежания циклических зависимостей
async function getPrisma() {
  const { prisma } = await import('../config/prisma.js');
  return prisma;
}

/**
 * Получает настройки из БД с кэшированием
 */
export async function getSettings(key) {
  const now = Date.now();
  
  // Проверяем кэш
  if (settingsCache.has(key) && cacheExpiry > now) {
    return settingsCache.get(key);
  }

  try {
    const prisma = await getPrisma();
    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    if (setting) {
      settingsCache.set(key, setting.value);
      cacheExpiry = now + CACHE_TTL;
      return setting.value;
    }
  } catch (e) {
    console.error('Failed to load settings:', e.message);
  }

  return null;
}

/**
 * Получает настройки AI
 */
export const GENERAL_SETTINGS_KEY = 'general_config';
export const STORAGE_SETTINGS_KEY = 'storage_config';
export const REGIONS_SETTINGS_KEY = 'regions_config';
/** Настройки OpenAI Images API для генерации обложек новостей */
export const AI_IMAGE_SETTINGS_KEY = 'ai_image_config';
/** Дефолтные реквизиты маркировки рекламы (ФЗ «О рекламе») */
export const AD_MARKING_SETTINGS_KEY = 'ad_marking_defaults';

export const defaultAdMarkingSettings = {
  /** Наименование рекламораспространителя / оператора */
  advertiserName: '',
  advertiserInn: '',
  advertiserOgrn: '',
  /** Пояснение к маркировке (опционально) */
  distributorNote: '',
};

const defaultGeneralSettings = {
  autoDeleteStaleUnpublishedNews: false,
  /** Объединение дубликатов из разных RSS после парсинга (требует настроенный ИИ) */
  mergeDuplicateNews: false,
};

const defaultStorageSettings = {
  provider: 'minio',
  minioEnabled: true,
  baseUrl: '',
  uploadEndpoint: '',
  httpMethod: 'POST',
  fileFieldName: 'file',
  pathFieldName: '',
  responseUrlPath: 'url',
  responsePathPath: '',
};

const defaultRegionsSettings = {
  regions: [process.env.NUXT_PUBLIC_REGION || 'Иваново'],
};

/**
 * Общие настройки приложения (вкладка «Основные» в админке).
 */
export async function getGeneralSettings() {
  const db = await getSettings(GENERAL_SETTINGS_KEY);
  if (db && typeof db === 'object') {
    return { ...defaultGeneralSettings, ...db };
  }
  return { ...defaultGeneralSettings };
}

/**
 * Настройки хранилища файлов (MinIO/CDN).
 * Если запись в БД отсутствует — используем env как fallback.
 */
export async function getStorageSettings() {
  const db = await getSettings(STORAGE_SETTINGS_KEY);
  if (db && typeof db === 'object') {
    return { ...defaultStorageSettings, ...db };
  }

  const hasS3Endpoint = Boolean(process.env.S3_ENDPOINT);
  const hasAwsCredentials = Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET
  );
  const minioEnabled = hasS3Endpoint || hasAwsCredentials;

  return {
    ...defaultStorageSettings,
    provider: minioEnabled ? 'minio' : 'cdn',
    minioEnabled,
  };
}

/**
 * Список доступных регионов сайта.
 * Если настройка в БД отсутствует — используем env как fallback.
 */
export async function getRegionsSettings() {
  const db = await getSettings(REGIONS_SETTINGS_KEY);
  if (db && typeof db === 'object') {
    const regions = Array.isArray(db.regions) ? db.regions : [];
    return { regions: regions.filter((r) => typeof r === 'string') };
  }
  return { ...defaultRegionsSettings };
}

export async function getAISettings() {
  const defaultSettings = {
    aiProvider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
    /** Tavily Search — доп. источники при «обзоре события» (можно задать в админке или TAVILY_API_KEY) */
    tavilyApiKey: process.env.TAVILY_API_KEY || '',
  };

  const dbSettings = await getSettings('ai_config');
  
  if (dbSettings) {
    return { ...defaultSettings, ...dbSettings };
  }

  return defaultSettings;
}

export const defaultImageGenSettings = {
  /** openai | custom | zai — совместимый с OpenAI POST /images/generations */
  imageProvider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'dall-e-3',
  size: '1792x1024',
};

/**
 * Настройки генерации изображений (обложек): отдельный API-ключ и endpoint.
 * Fallback из env: OPENAI_IMAGE_API_KEY, OPENAI_IMAGE_BASE_URL.
 */
/**
 * Глобальные значения для подписи «Реклама» и реквизитов (если не заданы в креативе).
 */
export async function getAdMarkingDefaults() {
  const db = await getSettings(AD_MARKING_SETTINGS_KEY);
  if (db && typeof db === 'object') {
    return { ...defaultAdMarkingSettings, ...db };
  }
  return { ...defaultAdMarkingSettings };
}

export async function getImageGenSettings() {
  const envProvider = (process.env.AI_IMAGE_PROVIDER || '').trim().toLowerCase();
  const defaults = {
    ...defaultImageGenSettings,
    ...(envProvider && ['openai', 'custom', 'zai'].includes(envProvider)
      ? { imageProvider: envProvider }
      : {}),
    apiKey: process.env.OPENAI_IMAGE_API_KEY || defaultImageGenSettings.apiKey,
    baseUrl: process.env.OPENAI_IMAGE_BASE_URL || defaultImageGenSettings.baseUrl,
  };

  const db = await getSettings(AI_IMAGE_SETTINGS_KEY);
  if (db && typeof db === 'object') {
    return { ...defaults, ...db };
  }

  return { ...defaults };
}

/**
 * Сбрасывает кэш настроек
 */
export function clearSettingsCache() {
  settingsCache.clear();
  cacheExpiry = 0;
}

/**
 * Обновляет настройки в БД и сбрасывает кэш
 */
export async function updateSettings(key, value) {
  const prisma = await getPrisma();
  
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  // Сбрасываем кэш
  settingsCache.delete(key);
  
  // Обновляем env переменные для совместимости
  if (key === 'ai_config') {
    if (value.aiProvider) process.env.AI_PROVIDER = value.aiProvider;
    if (value.apiKey) process.env.AI_API_KEY = value.apiKey;
    if (value.baseUrl !== undefined) process.env.AI_BASE_URL = value.baseUrl;
    if (value.model) process.env.AI_MODEL = value.model;
    if (value.temperature !== undefined) process.env.AI_TEMPERATURE = String(value.temperature);
    if (value.maxTokens !== undefined) process.env.AI_MAX_TOKENS = String(value.maxTokens);
    if (value.tavilyApiKey !== undefined) process.env.TAVILY_API_KEY = value.tavilyApiKey || '';
  }
}

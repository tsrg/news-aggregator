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

const defaultGeneralSettings = {
  autoDeleteStaleUnpublishedNews: false,
  /** Объединение дубликатов из разных RSS после парсинга (требует настроенный ИИ) */
  mergeDuplicateNews: false,
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

export async function getAISettings() {
  const defaultSettings = {
    aiProvider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
  };

  const dbSettings = await getSettings('ai_config');
  
  if (dbSettings) {
    return { ...defaultSettings, ...dbSettings };
  }

  return defaultSettings;
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
  }
}

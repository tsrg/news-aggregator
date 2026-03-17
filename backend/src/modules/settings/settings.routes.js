import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { getAISettings, updateSettings, clearSettingsCache } from '../../services/settings.js';
import { testAIConnection } from '../../services/ai.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('settings'));

const AI_SETTINGS_KEY = 'ai_config';

// Дефолтные настройки
const defaultAISettings = {
  aiProvider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2000,
};

// Получить настройки AI
router.get('/ai', async (req, res) => {
  try {
    const settings = await getAISettings();

    // Возвращаем настройки с маскированным apiKey
    return res.json({
      ...settings,
      apiKey: settings.apiKey ? '••••••••' + settings.apiKey.slice(-4) : '',
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить настройки AI
router.put('/ai', async (req, res) => {
  try {
    const { aiProvider, apiKey, baseUrl, model, temperature, maxTokens } = req.body;

    // Получаем текущие настройки
    const currentSettings = await getAISettings();

    // Обновляем только переданные поля
    const updatedSettings = {
      ...currentSettings,
      ...(aiProvider && { aiProvider }),
      ...(apiKey && !apiKey.startsWith('••••') && { apiKey }),
      ...(baseUrl !== undefined && { baseUrl }),
      ...(model && { model }),
      ...(temperature !== undefined && { temperature }),
      ...(maxTokens !== undefined && { maxTokens }),
    };

    // Сохраняем в БД и сбрасываем кэш
    await updateSettings(AI_SETTINGS_KEY, updatedSettings);

    console.log('AI settings updated:', {
      provider: updatedSettings.aiProvider,
      model: updatedSettings.model,
    });

    return res.json({
      ...updatedSettings,
      apiKey: updatedSettings.apiKey ? '••••••••' + updatedSettings.apiKey.slice(-4) : '',
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
    
    const existing = await prisma.setting.findUnique({
      where: { key: AI_SETTINGS_KEY },
    });

    if (!existing) {
      // Создаем дефолтные настройки
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
  } catch (e) {
    console.error('Failed to initialize settings:', e.message);
  }
}

export default router;

import { getAISettings, getImageGenSettings } from './settings.js';
import {
  looksLikeLatinTransliteratedRussianTitle,
  reverseTransliterateLatinToCyrillic,
} from '../utils/latinRussianTitle.js';

/**
 * Вызывает OpenAI-совместимое API
 */
async function callOpenAICompatible(url, key, body, options = {}) {
  console.log('AI Request:', { url, model: body.model, messagesCount: body.messages?.length });
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.timeout || 60000),
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.error('AI API Error:', res.status, err);
    throw new Error(err || `API error ${res.status}`);
  }
  
  const data = await res.json();
  console.log('AI Response:', JSON.stringify(data).slice(0, 1000));
  
  // Пробуем разные форматы ответа
  const message = data.choices?.[0]?.message;
  let text = message?.content?.trim() ||
             message?.reasoning_content?.trim() ||  // Z.ai glm-5 использует это поле
             data.choices?.[0]?.text?.trim() ||
             data.response?.trim() ||
             data.text?.trim() ||
             data.result?.alternatives?.[0]?.message?.text?.trim() ||
             data.output?.trim();
             
  if (!text) {
    console.error('Empty or unexpected AI response format:', data);
    throw new Error('Empty response from AI');
  }
  
  return text;
}

/**
 * Вызывает OpenAI API
 */
async function callOpenAI(prompt, options = {}) {
  const settings = await getAISettings();
  const key = settings.apiKey;
  
  if (!key) throw new Error('API Key not configured. Please set it in Settings.');

  const baseUrl = settings.baseUrl || 'https://api.openai.com/v1';
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  
  const body = {
    model: options.model || settings.model || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: options.max_tokens || settings.maxTokens || 2000,
    temperature: settings.temperature ?? 0.7,
  };
  
  return callOpenAICompatible(url, key, body, options);
}

/**
 * Вызывает Z.ai API (GigaChat через Z.ai)
 */
async function callZAI(prompt, options = {}) {
  const settings = await getAISettings();
  const key = settings.apiKey;
  
  if (!key) throw new Error('API Key not configured. Please set it in Settings.');

  // Z.ai использует OpenAI-совместимый формат
  const baseUrl = settings.baseUrl || 'https://api.z.ai/api/paas/v4';
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  
  // Некоторые модели Z.ai не поддерживают system role
  const body = {
    model: options.model || settings.model || 'glm-5',
    messages: [
      { role: 'user', content: prompt }
    ],
    max_tokens: options.max_tokens || settings.maxTokens || 2000,
    temperature: settings.temperature ?? 0.7,
  };
  
  return callOpenAICompatible(url, key, body, options);
}

/**
 * Вызывает Anthropic Claude API
 */
async function callAnthropic(prompt, options = {}) {
  const settings = await getAISettings();
  const key = settings.apiKey;
  
  if (!key) throw new Error('API Key not configured. Please set it in Settings.');

  const baseUrl = settings.baseUrl || 'https://api.anthropic.com/v1';
  const url = `${baseUrl.replace(/\/$/, '')}/messages`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: options.model || settings.model || 'claude-3-sonnet-20240229',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.max_tokens || settings.maxTokens || 2000,
      temperature: settings.temperature ?? 0.7,
    }),
    signal: AbortSignal.timeout(options.timeout || 60000),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Anthropic ${res.status}`);
  }
  
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim();
  if (!text) throw new Error('Empty response from AI');
  return text;
}

/**
 * Вызывает YandexGPT API
 */
async function callYandexGPT(prompt, options = {}) {
  const settings = await getAISettings();
  const key = settings.apiKey;
  
  if (!key) throw new Error('API Key not configured. Please set it in Settings.');

  const baseUrl = settings.baseUrl || 'https://llm.api.cloud.yandex.net/foundationModels/v1';
  const url = `${baseUrl.replace(/\/$/, '')}/completion`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Api-Key ${key}`,
    },
    body: JSON.stringify({
      modelUri: `gpt://${settings.model || 'yandexgpt-lite'}`,
      completionOptions: {
        maxTokens: options.max_tokens || settings.maxTokens || 2000,
        temperature: settings.temperature ?? 0.7,
      },
      messages: [{ role: 'user', text: prompt }],
    }),
    signal: AbortSignal.timeout(options.timeout || 60000),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `YandexGPT ${res.status}`);
  }
  
  const data = await res.json();
  const text = data.result?.alternatives?.[0]?.message?.text?.trim();
  if (!text) throw new Error('Empty response from AI');
  return text;
}

/**
 * Вызывает GigaChat API (Сбер) - напрямую, не через Z.ai
 */
async function callGigaChat(prompt, options = {}) {
  const settings = await getAISettings();
  const key = settings.apiKey;
  
  if (!key) throw new Error('API Key not configured. Please set it in Settings.');

  const baseUrl = settings.baseUrl || 'https://gigachat.devices.sberbank.ru/api/v1';
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: settings.model || 'GigaChat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.max_tokens || settings.maxTokens || 2000,
      temperature: settings.temperature ?? 0.7,
    }),
    signal: AbortSignal.timeout(options.timeout || 60000),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `GigaChat ${res.status}`);
  }
  
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from AI');
  return text;
}

/**
 * Выбирает провайдера и вызывает соответствующий API
 */
async function callAI(prompt, options = {}) {
  const settings = await getAISettings();
  const provider = settings.aiProvider || 'openai';

  switch (provider) {
    case 'zai':
      return callZAI(prompt, options);
    case 'anthropic':
      return callAnthropic(prompt, options);
    case 'yandex':
      return callYandexGPT(prompt, options);
    case 'gigachat':
      return callGigaChat(prompt, options);
    case 'openai':
    case 'custom':
    default:
      return callOpenAI(prompt, options);
  }
}

/**
 * Латинский транслит заголовка → кириллица (ИИ при наличии ключа, иначе табличный обратный транслит).
 * @param {string} title
 * @returns {Promise<string>}
 */
export async function normalizeNewsTitleIfNeeded(title) {
  if (!title || typeof title !== 'string') return title || '';
  const t = title.trim();
  if (!t) return t;
  if (!looksLikeLatinTransliteratedRussianTitle(t)) return t;

  const settings = await getAISettings();
  if (settings.apiKey) {
    try {
      const prompt = `Ниже заголовок новости, записанный латиницей (транслитерация русского текста). Преобразуй его в нормальный русский заголовок на кириллице. Не добавляй фактов и не меняй смысл. Ответь только текстом заголовка одной строкой, без кавычек и пояснений.

${t.slice(0, 500)}`;

      const raw = await callAI(prompt, {
        max_tokens: 220,
        temperature: 0.2,
        timeout: 20000,
      });
      const line = raw
        .trim()
        .replace(/^["«]|["»]$/g, '')
        .split('\n')[0]
        .trim();
      if (line && /[а-яёА-ЯЁ]/.test(line)) {
        return line.slice(0, 500);
      }
    } catch (e) {
      console.warn('normalizeNewsTitleIfNeeded AI:', e.message);
    }
  }

  return reverseTransliterateLatinToCyrillic(t);
}

/**
 * Синтез одной новости из нескольких источников (агрегация дубликатов).
 * @param {{ sources: Array<Record<string, unknown>> }} payload — массив снимков источников
 * @returns {{ title: string, body: string, summary: string }}
 */
export async function synthesizeMergedNewsFromSources(payload) {
  const settings = await getAISettings();
  if (!settings.apiKey) {
    throw new Error('API Key not configured');
  }

  const jsonIn = JSON.stringify(payload.sources ?? payload, null, 0);
  const prompt = `Ты редактор новостного агрегатора. Ниже JSON-массив «sources»: несколько версий одной темы из разных СМИ (поля sourceName, url, title, summary, body и т.д.).

Задача:
1) Составь ОДИН связный материал на русском языке: факты только из переданных текстов, ничего не выдумывай.
2) Заголовок — информативный, без кликбейта.
3) Поле body — HTML: допускаются только теги p, strong, em, a, ul, li, br. В тексте обязательно вставь осмысленные ссылки <a href="полный_URL" rel="noopener noreferrer" target="_blank">название источника</a> так, чтобы были представлены ВСЕ источники из входа (по полю url). Можно добавить в конце блок <p><strong>Источники:</strong></p><ul><li>...</li></ul> со ссылками.
4) Поле summary — короткий лид из 1–3 предложений, написанный по содержанию уже согласованного body (без новых фактов).

Входные данные:
${jsonIn.slice(0, 100000)}

Ответь ТОЛЬКО одним JSON-объектом без пояснений и без обёртки markdown:
{"title":"...","body":"...","summary":"..."}`;

  const raw = await callAI(prompt, {
    max_tokens: Math.min(8000, (settings.maxTokens || 2000) * 4),
    temperature: 0.35,
    timeout: 120000,
  });

  let parsed;
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('Не удалось разобрать JSON ответа ИИ');
    }
  } else {
    throw new Error('Пустой или неверный ответ ИИ');
  }

  const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  if (!title || !body) {
    throw new Error('ИИ вернул неполные поля title/body');
  }
  return { title, body, summary };
}

/**
 * Проверяет факты в новостном тексте
 */
export async function factCheckNews(title, summary, body) {
  const text = [title, summary, body].filter(Boolean).join('\n\n');
  
  if (!text.trim()) {
    throw new Error('Нет текста для проверки. Заполните заголовок, лид или текст новости.');
  }
  
  const prompt = `Проверь факты в следующем новостном тексте на соответствие известной действительности. Укажи возможные неточности или неподтверждённые утверждения и дай краткий вердикт (1-3 предложения).

Текст:
${text.slice(0, 8000)}`;
  
  // Увеличиваем лимит токенов для fact-checking
  const raw = await callAI(prompt, { max_tokens: 4000 });
  return { summary: raw, raw };
}

/** Действия, для которых ожидается JSON с массивом вариантов */
const AI_EDIT_VARIANTS_ACTIONS = new Set(['generate-title', 'generate-summary']);

/**
 * Убирает обёртку ```json ... ``` если модель её добавила.
 */
function stripMarkdownJsonFence(raw) {
  const t = String(raw || '').trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : t;
}

/**
 * Парсит {"variants":["..."]} из ответа ИИ.
 */
function parseVariantsJson(raw) {
  const trimmed = stripMarkdownJsonFence(raw);
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const arr = parsed.variants;
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      if (typeof v !== 'string') continue;
      const s = v.trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out.slice(0, 8);
  } catch {
    return [];
  }
}

/**
 * Редактирует текст с помощью AI
 */
export async function aiEdit(text, action, field) {
  const prompts = {
    improve: `Улучши стиль и ясность следующего текста, сохрани смысл. Ответь только улучшенным текстом.

${text}`,
    shorten: `Сократи следующий текст примерно вдвое, сохрани главное. Ответь только сокращённым текстом.

${text}`,
    expand: `Немного расширь следующий текст, добавив детали. Ответь только расширенным текстом.

${text}`,
    'generate-title': `По тексту новости придумай 4–5 разных коротких заголовков на русском языке в новостном стиле.
Запрещено: пояснения, пошаговый анализ, текст на английском, markdown вне JSON.
Ответь ТОЛЬКО одним JSON-объектом без текста до или после него:
{"variants":["вариант 1","вариант 2","вариант 3","вариант 4"]}

Текст новости:
${text}`,
    'generate-summary': `По тексту новости напиши 4–5 разных вариантов краткого лида (1–2 предложения каждый), на русском языке.
Запрещено: пояснения, пошаговый анализ, текст на английском, markdown вне JSON.
Ответь ТОЛЬКО одним JSON-объектом без текста до или после него:
{"variants":["лид 1","лид 2","лид 3","лид 4"]}

Текст новости:
${text}`,
  };

  const prompt = prompts[action] || `Обработай текст: ${action}

${text}`;
  const maxTokens = AI_EDIT_VARIANTS_ACTIONS.has(action) ? 2000 : 1000;
  const result = await callAI(prompt, { max_tokens: maxTokens });

  if (AI_EDIT_VARIANTS_ACTIONS.has(action)) {
    const variants = parseVariantsJson(result);
    if (variants.length > 0) {
      return { text: variants[0], variants };
    }
    return { text: String(result).trim(), variants: [] };
  }

  return { text: result, variants: [] };
}

function stripHtmlForCover(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Не дублировать суффикс, если в baseUrl уже указан полный путь …/images/generations */
function resolveImagesGenerationsUrl(baseUrlRaw) {
  const base = String(baseUrlRaw || '')
    .trim()
    .replace(/\/+$/, '');
  if (!base) return '';
  if (/\/images\/generations$/i.test(base)) return base;
  return `${base}/images/generations`;
}

/** Корень API Z.ai для картинок: …/api без /paas/v4 → дополняем */
function normalizeZaiImageBase(raw) {
  const s = String(raw || '').trim().replace(/\/$/, '');
  if (!s) return 'https://api.z.ai/api/paas/v4';
  if (/^https?:\/\/api\.z\.ai\/api$/i.test(s)) {
    return 'https://api.z.ai/api/paas/v4';
  }
  return s;
}

/** Размеры DALL·E → рекомендуемые для GLM-Image (docs.z.ai) */
function mapDalleSizeToZaiSize(size) {
  const s = String(size || '').trim().toLowerCase();
  const map = {
    '1024x1024': '1280x1280',
    '1792x1024': '1728x960',
    '1024x1792': '960x1728',
  };
  return map[s] || '1280x1280';
}

function resolveZaiImageModel(model) {
  const m = String(model || '').trim();
  const lower = m.toLowerCase();
  if (!m || lower === 'dall-e-3' || lower.startsWith('dall-e')) {
    return 'glm-image';
  }
  return m;
}

/**
 * Z.ai иногда отдаёт относительный путь; часть CDN требует User-Agent или Bearer.
 * @param {string} imageUrl
 * @param {{ originHint?: string, bearerToken?: string }} [opts]
 */
function resolveAbsoluteImageFetchUrl(imageUrl, opts = {}) {
  const raw = String(imageUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  const base = String(opts.originHint || 'https://api.z.ai')
    .trim()
    .replace(/\/$/, '');
  try {
    const u = new URL(raw, `${base}/`);
    return u.href;
  } catch {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${base}${path}`;
  }
}

async function fetchImageUrlAsBase64(imageUrl, opts = {}) {
  const { originHint, bearerToken } = opts;
  const absolute = resolveAbsoluteImageFetchUrl(imageUrl, { originHint });
  if (!absolute) {
    throw new Error('Пустой URL изображения в ответе API');
  }

  const baseHeaders = {
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'User-Agent': 'NewsAggregator/1.0 (cover; +https://github.com)',
  };

  async function tryFetch(withBearer) {
    const headers = { ...baseHeaders };
    if (withBearer && bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }
    return fetch(absolute, {
      signal: AbortSignal.timeout(120000),
      redirect: 'follow',
      headers,
    });
  }

  let res = await tryFetch(false);
  if (!res.ok && (res.status === 401 || res.status === 403) && bearerToken) {
    res = await tryFetch(true);
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      t?.slice(0, 500) || `Не удалось скачать сгенерированное изображение: ${res.status}`,
    );
  }
  const ct = (res.headers.get('content-type') || 'image/png').split(';')[0].trim();
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) {
    throw new Error('Пустой файл при скачивании изображения по URL');
  }
  return {
    mimeType: ct || 'image/png',
    imageBase64: buf.toString('base64'),
  };
}

/**
 * Генерация превью обложки через OpenAI Images API.
 * Ключ: настройки «API изображений» или (fallback) ключ основного ИИ при провайдере openai/custom.
 * @param {{ title?: string, summary?: string, body?: string }} input
 * @returns {Promise<{ mimeType: string, imageBase64: string }>}
 */
export async function generateCoverImagePreview({ title, summary, body }) {
  const image = await getImageGenSettings();
  const chat = await getAISettings();
  const chatProvider = (chat.aiProvider || 'openai').toLowerCase();
  const imgProvider = (image.imageProvider || 'openai').toLowerCase();

  const imageKey = (image.apiKey || '').trim();
  const chatKeyOpenAi = ['openai', 'custom'].includes(chatProvider)
    ? (chat.apiKey || '').trim()
    : '';
  const chatKeyZai = chatProvider === 'zai' ? (chat.apiKey || '').trim() : '';

  let apiKey = '';
  if (imgProvider === 'zai') {
    apiKey = imageKey || chatKeyZai;
  } else {
    apiKey = imageKey || chatKeyOpenAi;
  }

  if (!apiKey) {
    const hint =
      imgProvider === 'zai'
        ? 'Укажите API-ключ в блоке «Изображения» или выберите провайдер Z.ai в основном чате с ключом.'
        : 'Укажите API-ключ в «Настройки → Настройки AI → Изображения (обложки)» или настройте основной провайдер OpenAI / Custom с ключом для чата.';
    throw new Error(hint);
  }

  const imageBase = (image.baseUrl || '').trim();
  const chatBase = (chat.baseUrl || '').trim();
  const defaultBase =
    imgProvider === 'zai'
      ? 'https://api.z.ai/api/paas/v4'
      : 'https://api.openai.com/v1';
  let baseForUrl = imageBase || chatBase || defaultBase;
  if (imgProvider === 'zai') {
    baseForUrl = normalizeZaiImageBase(baseForUrl);
  }
  const baseUrl = String(baseForUrl).replace(/\/$/, '');
  const model = (image.model || 'dall-e-3').trim();
  const size = (image.size || '1792x1024').trim();

  const titlePart = (title || '').trim().slice(0, 200);
  const summaryPart = stripHtmlForCover(summary || '').slice(0, 400);
  const bodyPart = stripHtmlForCover(body || '').slice(0, 600);
  const context = [
    titlePart && `Тема: ${titlePart}`,
    summaryPart && `Кратко: ${summaryPart}`,
    bodyPart && `Детали: ${bodyPart}`,
  ]
    .filter(Boolean)
    .join('\n');

  if (!context.trim()) {
    throw new Error('Недостаточно текста для генерации обложки (заголовок или текст новости).');
  }

  const prompt = `Создай реалистичную или стилизованную редакционную иллюстрацию для новостного сайта на русском языке по следующему контексту. Никакого текста на изображении, без логотипов и водяных знаков. Нейтральный, серьёзный визуальный стиль, подходит для новостной ленты.

${context}`;

  const url = resolveImagesGenerationsUrl(baseUrl);
  if (!url) {
    throw new Error('Не задан базовый URL для Images API.');
  }

  const isZai = imgProvider === 'zai';
  const requestBody = isZai
    ? {
        model: resolveZaiImageModel(model),
        prompt: prompt.slice(0, 4000),
        size: mapDalleSizeToZaiSize(size),
        quality: 'standard',
      }
    : {
        model,
        prompt: prompt.slice(0, 4000),
        n: 1,
        size,
        response_format: 'b64_json',
      };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Images API error:', res.status, err);
    throw new Error(err || `Images API error ${res.status}`);
  }

  const data = await res.json();
  const first = Array.isArray(data.data) ? data.data[0] : data.data;
  const imageUrl =
    first?.url ||
    first?.image_url ||
    (typeof first === 'string' && /^https?:\/\//i.test(first) ? first : null);
  if (first?.b64_json) {
    return { mimeType: 'image/png', imageBase64: first.b64_json };
  }
  if (imageUrl) {
    return fetchImageUrlAsBase64(imageUrl, {
      originHint: baseUrl,
      bearerToken: isZai ? apiKey : undefined,
    });
  }

  console.error('Unexpected Images API response:', JSON.stringify(data).slice(0, 500));
  throw new Error('Пустой ответ Images API (нет b64_json и url).');
}

/**
 * Тестирует соединение с AI API
 */
export async function testAIConnection() {
  const settings = await getAISettings();
  
  if (!settings.apiKey) {
    throw new Error('API Key not configured');
  }

  const provider = settings.aiProvider || 'openai';

  try {
    // Делаем простой тестовый запрос
    await callAI('Say "OK" or respond with a short greeting', { max_tokens: 10, timeout: 30000 });
    return { success: true, message: 'Connection successful' };
  } catch (e) {
    throw new Error(e.message || 'Connection failed');
  }
}

import { getAISettings, getImageGenSettings } from './settings.js';
import { prisma } from '../config/prisma.js';
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
  if (options.responseFormatJson) {
    body.response_format = { type: 'json_object' };
  }

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
 * @param {{ sourceRules?: Array<Record<string, unknown>> }} [options]
 * @returns {{ title: string, body: string, summary: string }}
 */
export async function synthesizeMergedNewsFromSources(payload, options = {}) {
  const settings = await getAISettings();
  if (!settings.apiKey) {
    throw new Error('API Key not configured');
  }

  const combinedRule = combineSourceUsageRules(options.sourceRules || []);
  if (!combinedRule.allowMerge) {
    throw new Error('Merge is forbidden by source usage rules');
  }

  const jsonIn = JSON.stringify(payload.sources ?? payload, null, 0);
  const quoteLine = combinedRule.forbidVerbatimCopy
    ? `Прямые цитаты минимальны; суммарно не более ${combinedRule.quoteLimitPercent}% текста.`
    : `Суммарная доля прямых цитат не более ${combinedRule.quoteLimitPercent}% текста.`;
  const attributionLine = combinedRule.requireAttribution
    ? 'Обязательна атрибуция источников внутри текста и в блоке «Источники».'
    : 'Атрибуция источников желательна, но не обязательна.';
  const topLinkLine = combinedRule.requiresDirectLinkAtTop
    ? 'Если это возможно по структуре, поставь минимум одну прямую ссылку на первоисточник в первом абзаце.'
    : 'Ссылки можно распределять по тексту и в конце.';
  const prompt = `Ты опытный редактор регионального медиа. Ниже JSON-массив «sources»: несколько версий одной темы из разных СМИ (поля sourceName, url, title, summary, body и т.д.).

Стиль и тон:
- Пиши живым, человечным языком: связные абзацы, логичные переходы, без «сухого справочника» и без односложных тезисов без контекста.
- Сохраняй нейтральность и точность: факты только из переданных текстов, ничего не выдумывай.
- Избегай канцелярита и штампов («в настоящее время», «в рамках данного вопроса»). Предложения должны быть естественными для чтения вслух.
- Заголовок — информативный, без кликбейта.

Поле body — HTML (только теги: p, strong, em, a, ul, li, br). Объём до ~2000 символов без учёта HTML.

Структура body (обязательно сохрани этот порядок блоков, но внутри блоков отдавай предпочтение связному тексту, а не спискам):
1) Ввод: 2–3 абзаца <p> — кратко и понятно, что произошло и почему это важно читателю; где уместно, вплетай ссылки на источники в тексте.
2) Блок «Что подтверждено»: сначала подзаголовок <p><strong>Что подтверждено</strong></p>, затем 1–2 абзаца <p> связным текстом (не перечень фактов). Если без списка никак — допустим короткий <ul> с 2–4 пунктами, но каждый пункт — полноценное предложение, не обрывки.
3) Блок «Где источники расходятся»: <p><strong>Где источники расходятся</strong></p>, затем 1–2 абзаца <p>. Если расхождений нет — один абзац: нейтрально, что существенных расхождений в сообщениях не видно.
4) Блок «Источники»: <p><strong>Источники</strong></p><ul><li>...</li></ul> — каждый источник с <a href="полный_URL" rel="noopener noreferrer" target="_blank">название</a> и представь ВСЕ источники из входа (по полю url).

В body обязательно вставь осмысленные ссылки <a href="полный_URL" rel="noopener noreferrer" target="_blank">...</a> на все источники.

Массивы confirmedFacts и differences — короткие формулировки (по 3–6 строк) для служебного использования, дублируй смысл из body, формулируй их цельными фразами, не телеграфным стилем.

Определи contentClass: NEWS | REPORT | ANALYSIS | OPINION | UNKNOWN.
${topLinkLine}
Поле summary — живой лид из 2–4 предложений по уже согласованному body (без новых фактов).
${quoteLine}
${attributionLine}

Дополнительные ограничения от правообладателей:
${combinedRule.rewriteInstructions || 'Нет'}
${combinedRule.mergeNotes || ''}

Входные данные:
${jsonIn.slice(0, 100000)}

Ответь ТОЛЬКО одним JSON-объектом без пояснений и без обёртки markdown:
{"title":"...","body":"...","summary":"...","confirmedFacts":["..."],"differences":["..."],"contentClass":"NEWS"}`;

  const raw = await callAI(prompt, {
    max_tokens: Math.min(8000, (settings.maxTokens || 2000) * 4),
    temperature: 0.48,
    timeout: 120000,
  });

  let parsed;
  try {
    parsed = parseJsonObjectFromAiText(raw);
  } catch (e) {
    throw new Error(e?.message || 'Не удалось разобрать JSON ответа ИИ');
  }

  const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  const confirmedFacts = Array.isArray(parsed.confirmedFacts)
    ? parsed.confirmedFacts.filter((x) => typeof x === 'string').map((x) => x.trim()).filter(Boolean).slice(0, 8)
    : [];
  const differences = Array.isArray(parsed.differences)
    ? parsed.differences.filter((x) => typeof x === 'string').map((x) => x.trim()).filter(Boolean).slice(0, 8)
    : [];
  const contentClassRaw = typeof parsed.contentClass === 'string' ? parsed.contentClass.trim().toUpperCase() : 'UNKNOWN';
  const contentClass = ['NEWS', 'REPORT', 'ANALYSIS', 'OPINION', 'UNKNOWN'].includes(contentClassRaw)
    ? contentClassRaw
    : 'UNKNOWN';
  if (!title || !body) {
    throw new Error('ИИ вернул неполные поля title/body');
  }
  return { title, body, summary, confirmedFacts, differences, contentClass };
}

function normalizeSourceUsageRule(rule) {
  const quoteLimit = Number.isFinite(Number(rule?.quoteLimitPercent))
    ? Math.max(0, Math.min(100, Number(rule.quoteLimitPercent)))
    : 20;
  return {
    quoteLimitPercent: quoteLimit,
    requireAttribution: rule?.requireAttribution !== false,
    forbidVerbatimCopy: rule?.forbidVerbatimCopy !== false,
    allowMerge: rule?.allowMerge !== false,
    requiresDirectLinkAtTop: rule?.requiresDirectLinkAtTop === true,
    allowAnalyticalReuse: rule?.allowAnalyticalReuse === true,
    requiresManualApprovalForAnalytical: rule?.requiresManualApprovalForAnalytical !== false,
    contentClassDefault: typeof rule?.contentClassDefault === 'string' ? rule.contentClassDefault : 'UNKNOWN',
    rewriteInstructions: typeof rule?.rewriteInstructions === 'string' ? rule.rewriteInstructions.trim() : '',
    mergeNotes: typeof rule?.mergeNotes === 'string' ? rule.mergeNotes.trim() : '',
  };
}

export function combineSourceUsageRules(rules = []) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return normalizeSourceUsageRule({});
  }
  const normalized = rules.map((r) => normalizeSourceUsageRule(r));
  return {
    quoteLimitPercent: Math.min(...normalized.map((r) => r.quoteLimitPercent)),
    requireAttribution: normalized.some((r) => r.requireAttribution),
    forbidVerbatimCopy: normalized.some((r) => r.forbidVerbatimCopy),
    allowMerge: normalized.every((r) => r.allowMerge),
    requiresDirectLinkAtTop: normalized.some((r) => r.requiresDirectLinkAtTop),
    allowAnalyticalReuse: normalized.every((r) => r.allowAnalyticalReuse),
    requiresManualApprovalForAnalytical: normalized.some((r) => r.requiresManualApprovalForAnalytical),
    contentClassDefault: normalized.find((r) => r.contentClassDefault && r.contentClassDefault !== 'UNKNOWN')?.contentClassDefault || 'UNKNOWN',
    rewriteInstructions: normalized.map((r) => r.rewriteInstructions).filter(Boolean).join('\n\n'),
    mergeNotes: normalized.map((r) => r.mergeNotes).filter(Boolean).join('\n\n'),
  };
}

/**
 * Первый сбалансированный JSON-объект `{...}` с учётом строк в двойных кавычках.
 * @param {string} s
 * @returns {string|null}
 */
function extractFirstBalancedJsonObject(s) {
  const text = String(s || '');
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
    } else if (c === '"') {
      inString = true;
    } else if (c === '{') {
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Извлекает JSON из ответа модели: markdown ```json```, префиксный текст, сбалансированный объект.
 * @param {string} raw
 * @returns {object}
 */
function parseJsonObjectFromAiText(raw) {
  const text = String(raw || '').trim();
  if (!text) {
    throw new Error('Пустой ответ ИИ');
  }

  const candidates = [];

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) {
    candidates.push(fence[1].trim());
  }
  candidates.push(text);

  for (const chunk of candidates) {
    if (!chunk) continue;
    try {
      const parsed = JSON.parse(chunk);
      const obj = unwrapJsonObject(parsed);
      if (obj) return obj;
    } catch {
      /* next */
    }
  }

  const balanced = extractFirstBalancedJsonObject(text);
  if (balanced) {
    try {
      const parsed = JSON.parse(balanced);
      const obj = unwrapJsonObject(parsed);
      if (obj) return obj;
    } catch {
      /* fall through */
    }
  }

  throw new Error('ИИ вернул неверный формат ответа');
}

/**
 * @param {unknown} parsed
 * @returns {object|null}
 */
function unwrapJsonObject(parsed) {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed;
  }
  if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) {
    return parsed[0];
  }
  return null;
}

/**
 * Нормализует ответ модели: camelCase/snake_case, вложенный usageRule.
 * @param {unknown} parsed
 */
function normalizeGeneratedUsageRuleObject(parsed) {
  const root = parsed && typeof parsed === 'object' ? parsed : {};
  const inner =
    root.usageRule && typeof root.usageRule === 'object'
      ? root.usageRule
      : root;

  const str = (a, b) => {
    const v = a !== undefined && a !== null ? a : b;
    return typeof v === 'string' ? v.trim() : '';
  };

  const quoteRaw =
    inner.quoteLimitPercent ??
    inner.quote_limit_percent ??
    inner.quoteLimit;
  const quoteLimitRaw = Number(quoteRaw);
  const quoteLimitPercent = Number.isFinite(quoteLimitRaw)
    ? Math.max(0, Math.min(100, Math.round(quoteLimitRaw)))
    : 20;

  const bool = (v, def) => {
    if (v === true || v === false) return v;
    if (v === 'true') return true;
    if (v === 'false') return false;
    return def;
  };

  const contentClassRaw =
    typeof (inner.contentClassDefault ?? inner.content_class_default) === 'string'
      ? String(inner.contentClassDefault ?? inner.content_class_default).toUpperCase()
      : 'UNKNOWN';
  const contentClassDefault = ['NEWS', 'REPORT', 'ANALYSIS', 'OPINION', 'UNKNOWN'].includes(contentClassRaw)
    ? contentClassRaw
    : 'UNKNOWN';

  return {
    rewriteInstructions: str(inner.rewriteInstructions, inner.rewrite_instructions),
    quoteLimitPercent,
    requireAttribution: bool(
      inner.requireAttribution ?? inner.require_attribution,
      true,
    ),
    forbidVerbatimCopy: bool(
      inner.forbidVerbatimCopy ?? inner.forbid_verbatim_copy,
      true,
    ),
    allowMerge: bool(inner.allowMerge ?? inner.allow_merge, true),
    requiresDirectLinkAtTop: bool(
      inner.requiresDirectLinkAtTop ?? inner.requires_direct_link_at_top,
      false,
    ),
    allowAnalyticalReuse: bool(
      inner.allowAnalyticalReuse ?? inner.allow_analytical_reuse,
      false,
    ),
    requiresManualApprovalForAnalytical: bool(
      inner.requiresManualApprovalForAnalytical ?? inner.requires_manual_approval_for_analytical,
      true,
    ),
    contentClassDefault,
    mergeNotes: str(inner.mergeNotes, inner.merge_notes),
  };
}

/**
 * Генерирует структурированные правила использования материалов источника из свободного текста.
 * @param {string} sourceRulesText
 * @returns {Promise<{
 *  rewriteInstructions: string,
 *  quoteLimitPercent: number,
 *  requireAttribution: boolean,
 *  forbidVerbatimCopy: boolean,
 *  allowMerge: boolean,
 *  mergeNotes: string,
 *  requiresDirectLinkAtTop: boolean,
 *  allowAnalyticalReuse: boolean,
 *  requiresManualApprovalForAnalytical: boolean,
 *  contentClassDefault: string
 * }>}
 */
export async function generateSourceUsageRuleFromText(sourceRulesText) {
  const text = String(sourceRulesText || '').trim();
  if (!text) {
    throw new Error('Введите текст правил источника');
  }

  const prompt = `Ты редактор новостного агрегатора. Ниже дан свободный текст правил использования материалов источника.
Преобразуй его в строгую JSON-структуру для настроек системы.

Правила вывода:
1) Ответь ТОЛЬКО одним JSON-объектом.
2) Никакого markdown, пояснений и лишнего текста.
3) Если в исходном тексте нет явного ограничения, используй безопасные значения по умолчанию:
   - quoteLimitPercent: 20
   - requireAttribution: true
   - forbidVerbatimCopy: true
   - allowMerge: true
   - requiresDirectLinkAtTop: false
   - allowAnalyticalReuse: false
   - requiresManualApprovalForAnalytical: true
   - contentClassDefault: UNKNOWN
4) quoteLimitPercent должен быть целым числом от 0 до 100.
5) rewriteInstructions и mergeNotes — строки (можно пустые).
6) Имена полей в JSON — строго в camelCase: rewriteInstructions, quoteLimitPercent, requireAttribution, forbidVerbatimCopy, allowMerge, requiresDirectLinkAtTop, allowAnalyticalReuse, requiresManualApprovalForAnalytical, contentClassDefault, mergeNotes.

Верни объект ровно такого формата:
{"rewriteInstructions":"...","quoteLimitPercent":20,"requireAttribution":true,"forbidVerbatimCopy":true,"allowMerge":true,"requiresDirectLinkAtTop":false,"allowAnalyticalReuse":false,"requiresManualApprovalForAnalytical":true,"contentClassDefault":"UNKNOWN","mergeNotes":"..."}

Текст правил источника:
${text.slice(0, 12000)}`;

  const aiSettings = await getAISettings();
  const provider = String(aiSettings.aiProvider || 'openai').toLowerCase();
  const callOpts = {
    max_tokens: 2000,
    temperature: 0.2,
    timeout: 90000,
  };
  if (provider === 'openai' || provider === 'custom') {
    callOpts.responseFormatJson = true;
  }

  let raw;
  try {
    raw = await callAI(prompt, callOpts);
  } catch (e) {
    if (callOpts.responseFormatJson) {
      const { responseFormatJson: _, ...retryOpts } = callOpts;
      raw = await callAI(prompt, retryOpts);
    } else {
      throw e;
    }
  }

  const parsed = parseJsonObjectFromAiText(raw);
  return normalizeGeneratedUsageRuleObject(parsed);
}

function words(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function isTooSimilar(inputText, outputText, threshold = 0.82) {
  const a = new Set(words(inputText));
  const b = new Set(words(outputText));
  if (a.size === 0 || b.size === 0) return false;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const score = intersection / Math.min(a.size, b.size);
  return score >= threshold;
}

export async function rewriteNewsBodyBySourceRules(newsId, bodyText = '') {
  const item = await prisma.newsItem.findUnique({
    where: { id: newsId },
    include: { source: { include: { usageRule: true } } },
  });
  if (!item) throw new Error('News item not found');

  const sourceRule = normalizeSourceUsageRule(item.source?.usageRule || {});
  const sourceName = item.source?.name || 'Источник';
  const sourceUrl = item.url || item.source?.url || '';
  const original = String(bodyText || item.body || '').trim();
  if (!original) throw new Error('Нет текста для переписывания');

  const strictLine = sourceRule.forbidVerbatimCopy
    ? `Запрещено дословное копирование длинных фрагментов. Доля прямых цитат не выше ${sourceRule.quoteLimitPercent}%.`
    : `Доля прямых цитат не выше ${sourceRule.quoteLimitPercent}%.`;
  const attributionLine = sourceRule.requireAttribution
    ? `В конце добавь абзац с атрибуцией: "По данным ${sourceName}" и ссылкой на источник.`
    : 'Атрибуция желательна, если это уместно по контексту.';

  const prompt = `Перепиши новостной материал на русском языке для публикации в агрегаторе, строго соблюдая ограничения:
1) Сохрани только исходные факты, без добавления новых.
2) ${strictLine}
3) ${attributionLine}
4) Используй HTML с тегами: p, strong, em, a, ul, li, br.
5) Сделай текст уникальным, юридически безопасным и естественным для чтения: связные абзацы, живой язык без канцелярита и сухого перечисления, без потери нейтральности.

Дополнительные требования источника:
${sourceRule.rewriteInstructions || 'Нет дополнительных требований.'}

Источник: ${sourceName}${sourceUrl ? ` (${sourceUrl})` : ''}
Исходный текст:
${original.slice(0, 20000)}

Ответь только итоговым HTML-текстом без пояснений.`;

  const firstPass = await callAI(prompt, { max_tokens: 2600, temperature: 0.42, timeout: 90000 });
  const firstText = String(firstPass || '').trim();
  if (!sourceRule.forbidVerbatimCopy || !isTooSimilar(original, firstText)) {
    return { text: firstText, variants: [] };
  }

  const secondPrompt = `Нужно еще сильнее переформулировать текст без потери фактов.
Ограничения:
- не копируй исходные фразы;
- сохрани фактическую точность;
- доля цитат не выше ${sourceRule.quoteLimitPercent}%;
- формат HTML (p, strong, em, a, ul, li, br).

Исходник:
${original.slice(0, 20000)}

Твой прошлый вариант:
${firstText.slice(0, 20000)}

Ответь только улучшенным HTML.`;
  const secondPass = await callAI(secondPrompt, { max_tokens: 2600, temperature: 0.45, timeout: 90000 });
  return { text: String(secondPass || '').trim(), variants: [] };
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

  const prompt = `Создай редакционную иллюстрацию для новостного сайта по следующему контексту.

Регион и атмосфера: материалы для аудитории центральной части России — визуальный контекст уместен для умеренного климата, типичной российской городской и природной среды; избегай явно «иностранных» декоративных штампов (неуместные тропики, нерелевантная западная вывеска и т.п.), если тема новости этого не требует.

Обязательные ограничения:
- Не изображай лица, портреты и узнаваемых людей: никаких крупных планов лиц, «похожих на известных личностей» персонажей и реалистичных портретов.
- Если нужны люди — только обобщённо: силуэты, размытые фигуры вдали, толпа со спины, без детализации черт лица.
- Предпочитай общие сцены: архитектура, городской пейзаж, природа, интерьеры без акцента на лицах, предметы, символы, абстрактные или условные композиции, метафору темы без «иллюстрации конкретного человека».

Текст на изображении: по возможности без любых надписей; если на сцене неизбежно видны вывески, таблички или буквы — только кириллица (русский язык). Никаких латиницы и иных алфавитов на плакатах, экранах, дорожных знаках (кроме универсальных символов без букв). Без логотипов и водяных знаков.

Стиль: реалистичный или стилизованный, нейтральный и сдержанный, подходит для новостной ленты.

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

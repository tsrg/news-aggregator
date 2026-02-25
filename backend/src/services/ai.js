import { config } from '../config/index.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

async function callOpenAI(prompt, options = {}) {
  const key = config.ai.openaiApiKey;
  if (!key) throw new Error('OPENAI_API_KEY not configured');
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.max_tokens || 2000,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `OpenAI ${res.status}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from OpenAI');
  return text;
}

async function callZai(prompt) {
  const key = config.ai.zaiApiKey;
  if (!key) throw new Error('ZAI_API_KEY not configured');
  // Placeholder: z.ai API may differ; adjust endpoint and payload as per their docs
  const res = await fetch('https://api.z.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ prompt, max_tokens: 2000 }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`z.ai ${res.status}`);
  const data = await res.json();
  return data.text || data.response || JSON.stringify(data);
}

export async function factCheckNews(title, summary, body) {
  const text = [title, summary, body].filter(Boolean).join('\n\n');
  const prompt = `Проверь факты в следующем новостном тексте на соответствие известной действительности. Укажи возможные неточности или неподтверждённые утверждения и дай краткий вердикт (1-3 предложения).\n\nТекст:\n${text.slice(0, 8000)}`;
  const provider = config.ai.provider || 'openai';
  const raw = provider === 'zai' ? await callZai(prompt) : await callOpenAI(prompt);
  return { summary: raw, raw };
}

export async function aiEdit(text, action, field) {
  const prompts = {
    improve: `Улучши стиль и ясность следующего текста, сохрани смысл. Ответь только улучшенным текстом.\n\n${text}`,
    shorten: `Сократи следующий текст примерно вдвое, сохрани главное. Ответь только сокращённым текстом.\n\n${text}`,
    expand: `Немного расширь следующий текст, добавив детали. Ответь только расширенным текстом.\n\n${text}`,
    'generate-title': `Придумай короткий заголовок новости по тексту. Ответь только заголовком.\n\n${text}`,
    'generate-summary': `Напиши краткий лид (1-2 предложения) для новости по тексту. Ответь только лидом.\n\n${text}`,
  };
  const prompt = prompts[action] || `Обработай текст: ${action}\n\n${text}`;
  const provider = config.ai.provider || 'openai';
  const result = provider === 'zai' ? await callZai(prompt) : await callOpenAI(prompt, { max_tokens: 1000 });
  return { text: result };
}

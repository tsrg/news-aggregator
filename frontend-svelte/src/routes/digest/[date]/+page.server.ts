import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const serverBase = env.API_BASE_SERVER || env.PUBLIC_API_BASE || 'http://backend:3000';
  const { date } = params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw error(400, 'Неверный формат даты');
  }

  const res = await globalThis.fetch(`${serverBase}/api/digest/date/${date}`);

  if (res.status === 404) {
    throw error(404, 'Дайджест за эту дату не найден или ещё не готов');
  }
  if (!res.ok) {
    throw error(500, 'Ошибка загрузки дайджеста');
  }

  const digest = await res.json() as {
    id: string;
    date: string;
    status: string;
    articleTitle?: string;
    articleBody?: string;
    articleSummary?: string;
    newsCount: number;
    sections?: unknown;
    podcastDuration?: number;
    podcastPrompt?: string;
    podcastScript?: Array<{ speaker: 'A' | 'B'; text: string }>;
    podcastTopics?: Array<{ title: string; talkingPoints: string[]; estimatedSeconds: number }>;
    podcastVoiceStyle?: string;
    podcastSoundscapePrompt?: string;
    generatedAt?: string;
  };

  // Strip script tags server-side
  if (digest.articleBody) {
    digest.articleBody = digest.articleBody.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  }

  return { digest, date };
};

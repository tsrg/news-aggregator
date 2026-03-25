/**
 * Эвристика: строка похожа на русский заголовок, записанный латиницей (транслит/slug),
 * а не на обычный английский заголовок.
 */
export function looksLikeLatinTransliteratedRussianTitle(s) {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 6) return false;
  if (/[а-яёА-ЯЁ]/.test(t)) return false;
  if (!/[a-z]/i.test(t)) return false;

  const lower = t.toLowerCase();
  const words = lower.split(/[\s\-_]+/).filter(Boolean);

  // Типичные окончания/фрагменты русской транслитерации в URL и RSS
  const ruTranslitHints =
    /(ovo|ykh|ogo|ego|emu|omy|ova|eva|ina|enko|ovich|skaya|skoye|skiy|skii|skoy|nya|noy|nom|aya|iye|iya|iye|aia|eie|koy|kii|goy|gie|tsya|sya|shi|chi|zhi|zhn|stv|stv|chn|chn|ovsk|ievsk|grad|burg|ovsk|insk)/i;

  if (ruTranslitHints.test(lower)) return true;
  if (words.length >= 3 && t.length >= 12) return true;
  if (words.length >= 2 && t.length >= 28) return true;
  if (t.length >= 18 && /^[a-z\s\-_.]+$/i.test(t) && words.length >= 2) return true;

  return false;
}

/** Пары «латиница → кириллица», длинные сначала (жадное совпадение слева направо). */
const DIGRAPHS_ORDERED = [
  ['shch', 'щ'],
  ['sch', 'щ'],
  ['zh', 'ж'],
  ['kh', 'х'],
  ['ch', 'ч'],
  ['sh', 'ш'],
  ['ts', 'ц'],
  ['yo', 'ё'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['ye', 'е'],
  ['yi', 'и'],
  ['iya', 'ия'],
  ['ykh', 'ых'],
  ['ikh', 'их'],
  ['akh', 'ах'],
  ['yev', 'ев'],
  ['yov', 'ёв'],
  ['ovo', 'ово'],
  ['ogo', 'ого'],
  ['ego', 'его'],
  ['emu', 'ему'],
  ['omy', 'ому'],
  ['ova', 'ова'],
  ['eva', 'ева'],
  ['iye', 'ие'],
  ['oy', 'ой'],
  ['ey', 'ей'],
  ['uy', 'уй'],
  ['ay', 'ай'],
  ['iy', 'ий'],
  ['ie', 'ие'],
];

const SINGLE = new Map(
  Object.entries({
    a: 'а',
    b: 'б',
    v: 'в',
    w: 'в',
    g: 'г',
    d: 'д',
    e: 'е',
    z: 'з',
    i: 'и',
    j: 'й',
    k: 'к',
    l: 'л',
    m: 'м',
    n: 'н',
    o: 'о',
    p: 'п',
    q: 'к',
    r: 'р',
    s: 'с',
    t: 'т',
    u: 'у',
    f: 'ф',
    x: 'кс',
    h: 'х',
    c: 'ц',
    y: 'ы',
  }),
);

/**
 * Обратная транслитерация (приближённо, без словаря): слово целиком в нижнем регистре.
 */
function transliterateWord(word) {
  if (!word) return '';
  let w = word.toLowerCase();
  let out = '';
  let pos = 0;
  while (pos < w.length) {
    let matched = false;
    for (const [lat, cyr] of DIGRAPHS_ORDERED) {
      if (w.startsWith(lat, pos)) {
        out += cyr;
        pos += lat.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const ch = w[pos];
    if (SINGLE.has(ch)) {
      out += SINGLE.get(ch);
      pos += 1;
      continue;
    }
    if (ch === "'" || ch === '’' || ch === '`') {
      pos += 1;
      continue;
    }
    out += ch;
    pos += 1;
  }
  // Финальная «y» после гласной (krasnoy → красной): й; после согласной (ikry → икры): ы
  if (/y$/i.test(word) && out.endsWith('ы')) {
    const before = out.slice(0, -1);
    const prev = before.slice(-1);
    if (prev && /[аеёиоуыэюя]/.test(prev)) {
      out = before + 'й';
    }
  }
  return out;
}

/**
 * Детерминированная обратная транслитерация заголовка: слова разделены пробелами/дефисами.
 */
export function reverseTransliterateLatinToCyrillic(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim();
  if (!s) return '';

  return s
    .split(/(\s+|[-–—]+)/)
    .map((part) => {
      if (/^\s+$/.test(part) || /^[-–—]+$/.test(part)) return part.replace(/[-–—]/g, ' ');
      if (!/[a-z]/i.test(part)) return part;
      return transliterateWord(part.replace(/[^a-zA-Z']/g, ''));
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

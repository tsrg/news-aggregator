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

  // Типичные окончания/фрагменты русской транслитерации в URL и RSS
  const ruTranslitHints =
    /(ovo|ykh|ogo|ego|emu|omy|ova|eva|ina|enko|ovich|skaya|skoye|skiy|skii|skoy|nya|noy|nom|aya|iye|iya|iye|aia|eie|koy|kii|goy|gie|tsya|sya|shi|chi|zhi|zhn|stv|chn|ovsk|ievsk|grad|burg|insk)/i;

  if (ruTranslitHints.test(lower)) return true;

  return false;
}

/**
 * Таблица паттернов обратной транслитерации.
 * Порядок: длинные совпадения первыми (жадный left-to-right matching).
 * Поддерживает: ГОСТ-7.79, паспортный, неформальный (slug/URL).
 *
 * Каждая запись: [латиница_нижний_регистр, кириллица]
 */
const PATTERNS = [
  // ── 4 символа ──────────────────────────────────────────────────────────
  ['shch', 'щ'],

  // ── 3 символа ──────────────────────────────────────────────────────────
  ['sch',  'щ'],   // альтернативный вариант щ
  ['tch',  'ч'],   // редко, но встречается
  ['dzh',  'дж'],  // заимствования: Дж
  // 3-символьные гласные окончания — важно поставить ДО 2-символьных,
  // чтобы «aya» не распадалось на «ay» + «a» (Moskovskaya → Московская)
  ['aya',  'ая'],  // московская, русская, новая
  ['oye',  'ое'],  // новое, красное
  ['uyu',  'ую'],  // новую, русскую

  // ── 2 символа ──────────────────────────────────────────────────────────
  // диграфы-согласные
  ['zh',   'ж'],
  ['kh',   'х'],
  ['ch',   'ч'],
  ['sh',   'ш'],
  // ts → ц только перед гласной (иначе «отставку» превращается в «оцтавку»)
  // реализовано через lookahead в transliterateWord
  ['ts',   'ц'],
  ['tz',   'ц'],

  // диграфы с y-гласными (ye/yo/yu/ya — йотированные)
  ['yo',   'ё'],
  ['yu',   'ю'],
  ['ya',   'я'],
  ['ye',   'е'],
  ['yi',   'и'],
  ['io',   'ё'],   // Fiodor / Fedor-вариант

  // диграфы-окончания (ий/ой/ей/ай/уй)
  ['yy',   'ый'],  // novyy → новый, dobryy → добрый
  ['iya',  'ия'],  // organizatsiya → организация (должно быть ДО iy)
  ['iy',   'ий'],  // skiy → ский, kiy → кий
  ['oy',   'ой'],
  ['ey',   'ей'],
  ['ay',   'ай'],
  ['uy',   'уй'],

  // ie → ие (встречается в слогах типа nie → ние)
  ['ie',   'ие'],

  // ── 1 символ ──────────────────────────────────────────────────────────
  // j всегда й (ГОСТ, паспорт)
  ['j',    'й'],

  ['a',    'а'],
  ['b',    'б'],
  ['c',    'с'],   // ch уже обработан выше; c отдельно = с (в рус. словах)
  ['d',    'д'],
  ['e',    'е'],
  ['f',    'ф'],
  ['g',    'г'],
  ['h',    'х'],
  ['i',    'и'],
  ['k',    'к'],
  ['l',    'л'],
  ['m',    'м'],
  ['n',    'н'],
  ['o',    'о'],
  ['p',    'п'],
  ['q',    'к'],
  ['r',    'р'],
  ['s',    'с'],
  ['t',    'т'],
  ['u',    'у'],
  ['v',    'в'],
  ['w',    'в'],
  ['x',    'кс'],
  ['y',    'ы'],   // fallback; постобработка уточняет по контексту
  ['z',    'з'],
];

// Гласные кириллицы — нужны для контекстной проверки
const CYR_VOWELS = new Set('аеёиоуыэюяАЕЁИОУЫЭЮЯ');

// Гласные латиницы — для lookahead при проверке «ts»
const LAT_VOWELS = new Set('aeiouy');

/**
 * Транслитерирует одно слово из латиницы в кириллицу с сохранением регистра.
 * Алгоритм: жадное сопоставление слева направо по таблице PATTERNS.
 */
function transliterateWord(word) {
  if (!word) return '';

  // Запоминаем, какие позиции входного слова были в верхнем регистре
  const upperMask = [...word].map((c) => c !== c.toLowerCase());
  const lower = word.toLowerCase();

  let out = '';         // накапливаем кириллический результат
  let outPos = [];      // для каждого символа out — индекс первого символа PATTERNS-совпадения
  let pos = 0;

  while (pos < lower.length) {
    let matched = false;

    for (const [lat, cyr] of PATTERNS) {
      if (lower.startsWith(lat, pos)) {
        // Lookahead для «ts»: сопоставляем с «ц» только если следующий символ —
        // гласная или конец слова. Иначе «отставку» → «оцтавку» (баг на стыке морфем).
        if (lat === 'ts') {
          const after = lower[pos + 2];
          if (after !== undefined && !LAT_VOWELS.has(after)) {
            // Пропускаем это совпадение — «t» и «s» будут обработаны по отдельности
            continue;
          }
        }

        // Записываем позицию источника для каждого выходного символа
        for (let i = 0; i < cyr.length; i++) {
          outPos.push(pos);
        }
        out += cyr;
        pos += lat.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Символ не в таблице (цифры, пунктуация) — оставляем как есть
      outPos.push(pos);
      out += lower[pos];
      pos += 1;
    }
  }

  // ── Контекстная постобработка 'ы' → 'й' ────────────────────────────
  // Если результат содержит 'ы' и предыдущий символ — гласная, заменяем на 'й'.
  // Пример: krasnoy → красной (ой уже в диграфе), но на случай пропусков.
  out = [...out]
    .map((ch, i) => {
      if (ch === 'ы' && i > 0 && CYR_VOWELS.has(out[i - 1])) return 'й';
      return ch;
    })
    .join('');

  // ── Восстановление регистра ──────────────────────────────────────────
  // Если первая буква входного слова — заглавная, делаем заглавной первую букву выхода.
  // Если входное слово целиком в верхнем регистре — выход тоже в верхнем.
  const allUpper = upperMask.every(Boolean);
  const firstUpper = upperMask[0];

  if (allUpper) {
    return out.toUpperCase();
  }
  if (firstUpper) {
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}

/**
 * Детерминированная обратная транслитерация заголовка без вызова ИИ.
 * Слова разделяются пробелами / дефисами / подчёркиванием.
 *
 * @param {string} raw  — заголовок, записанный латиницей
 * @returns {string}    — заголовок на кириллице
 */
export function reverseTransliterateLatinToCyrillic(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim();
  if (!s) return '';

  // Разбиваем по разделителям, сохраняя их для правильной склейки
  return s
    .split(/(\s+|[-–—_]+)/)
    .map((part) => {
      // Разделители → пробел
      if (/^\s+$/.test(part) || /^[-–—_]+$/.test(part)) return ' ';
      // Нет латинских букв — оставляем без изменений (цифры, кириллица и т.п.)
      if (!/[a-zA-Z]/.test(part)) return part;
      return transliterateWord(part);
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

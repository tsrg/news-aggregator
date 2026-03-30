const CONTENT_CLASSES = new Set(['NEWS', 'REPORT', 'ANALYSIS', 'OPINION', 'UNKNOWN']);

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAnchors(html) {
  const raw = String(html || '');
  const out = [];
  const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let m = re.exec(raw);
  while (m) {
    out.push(String(m[1] || '').trim());
    m = re.exec(raw);
  }
  return out;
}

function normalizeUrl(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    u.hash = '';
    if (u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    return u.toString();
  } catch {
    return s.replace(/\/+$/, '');
  }
}

function hasLinkInFirstParagraph(bodyHtml, url) {
  const body = String(bodyHtml || '');
  const firstParagraphMatch = body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  const firstChunk = firstParagraphMatch ? firstParagraphMatch[0] : body.slice(0, 800);
  const normalized = normalizeUrl(url);
  if (!normalized) return false;
  return firstChunk.includes(url) || firstChunk.includes(normalized);
}

function detectContentClass({ title, summary, body, fallback = 'UNKNOWN' }) {
  if (CONTENT_CLASSES.has(fallback) && fallback !== 'UNKNOWN') return fallback;
  const text = `${title || ''} ${summary || ''} ${stripHtml(body || '')}`.toLowerCase();
  if (!text) return 'UNKNOWN';
  const analysisMarkers = [
    'мнение',
    'колонка',
    'аналитик',
    'аналитика',
    'авторская',
    'эксперт считает',
    'редакция считает',
  ];
  const opinionMarkers = ['я считаю', 'по моему мнению', 'моя позиция'];
  if (opinionMarkers.some((m) => text.includes(m))) return 'OPINION';
  if (analysisMarkers.some((m) => text.includes(m))) return 'ANALYSIS';
  return 'NEWS';
}

function evaluateRulesForAnalyticalContent(contentClass, rules) {
  if (!['ANALYSIS', 'OPINION'].includes(contentClass)) {
    return { ok: true, needsManualApproval: false, reason: '' };
  }
  const list = Array.isArray(rules) ? rules : [];
  const disallow = list.some((r) => r?.allowAnalyticalReuse === false);
  if (disallow) {
    return { ok: false, needsManualApproval: true, reason: 'Источник запрещает использование аналитических материалов' };
  }
  const manual = list.some((r) => r?.requiresManualApprovalForAnalytical !== false);
  if (manual) {
    return { ok: true, needsManualApproval: true, reason: 'Требуется ручное одобрение для аналитического материала' };
  }
  return { ok: true, needsManualApproval: false, reason: '' };
}

export function runLegalComplianceChecks({
  title,
  summary,
  body,
  sourceSnapshots,
  sourceRules,
  declaredContentClass,
}) {
  const sources = Array.isArray(sourceSnapshots) ? sourceSnapshots : [];
  const rules = Array.isArray(sourceRules) ? sourceRules : [];
  const contentClass = detectContentClass({
    title,
    summary,
    body,
    fallback: declaredContentClass || 'UNKNOWN',
  });
  const links = extractAnchors(body);
  const linkSet = new Set(links.map((x) => normalizeUrl(x)).filter(Boolean));

  const requireAttribution = rules.some((r) => r?.requireAttribution !== false);
  const requiresDirectLinkAtTop = rules.some((r) => r?.requiresDirectLinkAtTop === true);
  const quoteLimitPercent = Math.min(
    ...rules.map((r) => (Number.isFinite(Number(r?.quoteLimitPercent)) ? Number(r.quoteLimitPercent) : 20)),
    100,
  );
  const effectiveQuoteLimit = Number.isFinite(quoteLimitPercent) ? quoteLimitPercent : 20;

  const missingLinks = [];
  for (const s of sources) {
    const u = normalizeUrl(s?.url);
    if (!u) continue;
    if (!linkSet.has(u) && !links.some((l) => l.includes(u))) {
      missingLinks.push(u);
    }
  }

  let topLinkViolation = false;
  if (requiresDirectLinkAtTop && sources.length > 0) {
    topLinkViolation = !sources.some((s) => s?.url && hasLinkInFirstParagraph(body, s.url));
  }

  const analytical = evaluateRulesForAnalyticalContent(contentClass, rules);
  const notes = [];
  let legalReviewStatus = 'APPROVED';
  if (requireAttribution && missingLinks.length > 0) {
    legalReviewStatus = 'NEEDS_REVIEW';
    notes.push('В тексте отсутствуют ссылки на часть источников');
  }
  if (topLinkViolation) {
    legalReviewStatus = 'NEEDS_REVIEW';
    notes.push('Нет прямой ссылки на источник в начале материала');
  }
  if (!analytical.ok) {
    legalReviewStatus = 'REJECTED';
    notes.push(analytical.reason);
  } else if (analytical.needsManualApproval && legalReviewStatus !== 'REJECTED') {
    legalReviewStatus = 'NEEDS_REVIEW';
    notes.push(analytical.reason);
  }

  return {
    contentClass,
    legalReviewStatus,
    legalReviewNotes: notes.join('. ').trim() || null,
    checks: {
      requireAttribution,
      requiresDirectLinkAtTop,
      effectiveQuoteLimit,
      missingLinks,
      sourceCount: sources.length,
    },
  };
}

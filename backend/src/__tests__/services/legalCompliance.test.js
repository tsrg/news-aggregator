import { describe, it, expect } from 'vitest';
import { runLegalComplianceChecks } from '../../services/legalCompliance.js';

// Базовые данные для тестов
const baseArticle = {
  title: 'Тестовый заголовок новости',
  summary: 'Краткое содержание материала',
  body: '<p>Текст статьи с <a href="https://source.example.com/article">ссылкой на источник</a>.</p>',
  sourceSnapshots: [
    { sourceId: 'src-1', sourceName: 'Тестовый источник', url: 'https://source.example.com/article' },
  ],
  sourceRules: [],
  declaredContentClass: 'NEWS',
};

const noRules = [];
const defaultRule = {
  requireAttribution: true,
  forbidVerbatimCopy: true,
  allowMerge: true,
  requiresDirectLinkAtTop: false,
  allowAnalyticalReuse: true,
  requiresManualApprovalForAnalytical: false,
  quoteLimitPercent: 20,
};

describe('runLegalComplianceChecks — базовые сценарии', () => {
  it('возвращает APPROVED для NEWS-материала с ссылкой на источник', () => {
    const result = runLegalComplianceChecks(baseArticle);
    expect(result.legalReviewStatus).toBe('APPROVED');
    expect(result.contentClass).toBe('NEWS');
    expect(result.legalReviewNotes).toBeNull();
  });

  it('возвращает корректные поля в checks', () => {
    const result = runLegalComplianceChecks(baseArticle);
    expect(result.checks).toHaveProperty('requireAttribution');
    expect(result.checks).toHaveProperty('requiresDirectLinkAtTop');
    expect(result.checks).toHaveProperty('effectiveQuoteLimit');
    expect(result.checks).toHaveProperty('missingLinks');
    expect(result.checks).toHaveProperty('sourceCount');
  });

  it('возвращает APPROVED если sourceSnapshots пуст и нет правил', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      sourceSnapshots: [],
      sourceRules: [],
    });
    expect(result.legalReviewStatus).toBe('APPROVED');
  });
});

describe('runLegalComplianceChecks — отсутствие ссылок на источники', () => {
  it('возвращает NEEDS_REVIEW если ссылка на источник отсутствует в тексте', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      body: '<p>Текст статьи без ссылки на источник.</p>',
      sourceRules: [defaultRule],
    });
    expect(result.legalReviewStatus).toBe('NEEDS_REVIEW');
    expect(result.legalReviewNotes).toContain('отсутствуют ссылки');
  });

  it('возвращает APPROVED если requireAttribution = false и ссылок нет', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      body: '<p>Текст статьи без ссылки.</p>',
      sourceRules: [{ ...defaultRule, requireAttribution: false }],
    });
    expect(result.legalReviewStatus).toBe('APPROVED');
  });
});

describe('runLegalComplianceChecks — requiresDirectLinkAtTop', () => {
  it('возвращает NEEDS_REVIEW если ссылка не в первом параграфе', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      body: '<p>Вводный параграф без ссылки.</p><p>Второй параграф с <a href="https://source.example.com/article">ссылкой</a>.</p>',
      sourceRules: [{ ...defaultRule, requiresDirectLinkAtTop: true }],
    });
    expect(result.legalReviewStatus).toBe('NEEDS_REVIEW');
    expect(result.legalReviewNotes).toContain('в начале');
  });

  it('возвращает APPROVED если ссылка есть в первом параграфе', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      body: '<p><a href="https://source.example.com/article">Источник</a>: текст статьи.</p>',
      sourceRules: [{ ...defaultRule, requiresDirectLinkAtTop: true }],
    });
    expect(result.legalReviewStatus).toBe('APPROVED');
  });
});

describe('runLegalComplianceChecks — contentClass и аналитика', () => {
  it('определяет ANALYSIS по маркерам в тексте', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      title: 'Аналитика рынка недвижимости',
      body: '<p>Эксперт считает, что ситуация улучшится.</p>',
      sourceRules: [],
      declaredContentClass: 'UNKNOWN',
    });
    expect(result.contentClass).toBe('ANALYSIS');
  });

  it('определяет OPINION по маркерам "я считаю"', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      title: 'Точка зрения',
      summary: 'Я считаю, что это важно',
      body: '<p>Моё мнение по данному вопросу.</p>',
      sourceRules: [],
      declaredContentClass: 'UNKNOWN',
    });
    expect(result.contentClass).toBe('OPINION');
  });

  it('возвращает REJECTED если источник запрещает аналитику', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      title: 'Мнение эксперта',
      summary: 'Аналитика',
      body: '<p>Эксперт считает что ситуация критическая.</p>',
      sourceRules: [{ ...defaultRule, allowAnalyticalReuse: false }],
      declaredContentClass: 'UNKNOWN',
    });
    expect(result.legalReviewStatus).toBe('REJECTED');
    expect(result.legalReviewNotes).toContain('запрещает');
  });

  it('возвращает NEEDS_REVIEW для ANALYSIS с requiresManualApprovalForAnalytical', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      title: 'Аналитический материал',
      summary: 'Аналитика рынка',
      body: '<p>Аналитик считает что...</p>',
      sourceRules: [{ ...defaultRule, allowAnalyticalReuse: true, requiresManualApprovalForAnalytical: true }],
      declaredContentClass: 'UNKNOWN',
    });
    expect(result.legalReviewStatus).toBe('NEEDS_REVIEW');
  });

  it('используется declaredContentClass если он задан и не UNKNOWN', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      title: 'Обычный заголовок без маркеров',
      body: '<p>Текст <a href="https://source.example.com/article">с ссылкой</a>.</p>',
      declaredContentClass: 'REPORT',
      sourceRules: [],
    });
    expect(result.contentClass).toBe('REPORT');
  });
});

describe('runLegalComplianceChecks — effectiveQuoteLimit', () => {
  it('использует минимальный quoteLimitPercent из нескольких правил', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      sourceRules: [
        { ...defaultRule, quoteLimitPercent: 30 },
        { ...defaultRule, quoteLimitPercent: 10 },
      ],
    });
    expect(result.checks.effectiveQuoteLimit).toBe(10);
  });

  it('возвращает 100% если правил нет (нет ограничения по умолчанию)', () => {
    // Math.min(...[].map(...), 100) === Math.min(100) === 100
    // Ограничение квотирования появляется только если в правилах явно указан quoteLimitPercent
    const result = runLegalComplianceChecks({
      ...baseArticle,
      sourceRules: [],
    });
    expect(result.checks.effectiveQuoteLimit).toBe(100);
  });
});

describe('runLegalComplianceChecks — обработка нестандартного ввода', () => {
  it('обрабатывает sourceSnapshots = undefined', () => {
    const result = runLegalComplianceChecks({
      title: 'Заголовок',
      summary: '',
      body: '',
      sourceSnapshots: undefined,
      sourceRules: undefined,
      declaredContentClass: 'NEWS',
    });
    expect(result.legalReviewStatus).toBe('APPROVED');
    expect(result.checks.sourceCount).toBe(0);
  });

  it('обрабатывает источник без URL (пропускает проверку ссылки)', () => {
    const result = runLegalComplianceChecks({
      ...baseArticle,
      body: '<p>Текст без ссылок.</p>',
      sourceSnapshots: [{ sourceId: 'src-1', sourceName: 'Источник', url: null }],
      sourceRules: [defaultRule],
    });
    // Нет URL для проверки — missingLinks должен быть пустым
    expect(result.checks.missingLinks).toHaveLength(0);
  });
});

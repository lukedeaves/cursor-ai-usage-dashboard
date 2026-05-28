import { describe, it, expect } from 'vitest';
import {
  parseNum, normaliseDate, makeRowKey, parseCsvRows, applyRowFilters,
  bucketKey, buildMetricByBucket, getDateRange, getPeriodPresetRange,
  computeTotals, pctChange, getPreviousPeriodRows,
} from '../js/utils.js';

describe('parseNum', () => {
  it('parses numbers and currency', () => {
    expect(parseNum('1.14')).toBe(1.14);
    expect(parseNum('$2.50')).toBe(2.5);
    expect(parseNum('-')).toBe(0);
    expect(parseNum('')).toBe(0);
  });
});

describe('normaliseDate', () => {
  it('handles ISO timestamps', () => {
    expect(normaliseDate('2026-03-08T03:24:43.852Z')).toBe('2026-03-08');
  });
  it('handles MM/DD/YYYY', () => {
    expect(normaliseDate('3/8/2026')).toBe('2026-03-08');
  });
});

describe('makeRowKey', () => {
  it('creates stable composite keys', () => {
    const row = {
      date: '2026-03-08', user: 'Jane', kind: 'Included', model: 'gpt-4',
      maxMode: 'No', inputCache: 1, inputNoCache: 2, cacheRead: 3,
      output: 4, total: 10, cost: 0.5,
    };
    expect(makeRowKey(row)).toBe(makeRowKey({ ...row }));
  });
});

describe('parseCsvRows', () => {
  it('maps Cursor CSV columns', () => {
    const rows = parseCsvRows([{
      Date: '2026-03-08T03:24:43.852Z', User: 'Jane', Kind: 'Included',
      Model: 'composer-1', 'Max Mode': 'No', 'Input (w/ Cache Write)': '100',
      'Input (w/o Cache Write)': '0', 'Cache Read': '50', 'Output Tokens': '20',
      'Total Tokens': '170', Cost: '0.05',
    }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].user).toBe('Jane');
    expect(rows[0].cost).toBe(0.05);
  });
});

describe('applyRowFilters', () => {
  const rows = [
    { date: '2026-03-01', user: 'A', kind: 'Included', model: 'm1', cost: 1 },
    { date: '2026-03-15', user: 'B', kind: 'Errored', model: 'm2', cost: 2 },
  ].map(r => ({ ...r, maxMode: '', inputCache: 0, inputNoCache: 0, cacheRead: 0, output: 0, total: 0 }));

  it('filters by date range', () => {
    const out = applyRowFilters(rows, { from: '2026-03-10', to: '2026-03-20', users: [], kinds: [], models: [] });
    expect(out).toHaveLength(1);
    expect(out[0].user).toBe('B');
  });

  it('filters by user', () => {
    const out = applyRowFilters(rows, { from: '', to: '', users: ['A'], kinds: [], models: [] });
    expect(out).toHaveLength(1);
  });
});

describe('bucketKey', () => {
  it('aggregates by day/week/month', () => {
    expect(bucketKey('2026-03-08', 'day')).toBe('2026-03-08');
    expect(bucketKey('2026-03-08', 'month')).toBe('2026-03');
    expect(bucketKey('2026-03-08', 'week')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('buildMetricByBucket', () => {
  it('sums cost by day', () => {
    const rows = [
      { date: '2026-03-01', cost: 1, total: 100 },
      { date: '2026-03-01', cost: 2, total: 200 },
    ];
    const pts = buildMetricByBucket(rows, 'day', 'cost');
    expect(pts).toHaveLength(1);
    expect(pts[0].y).toBe(3);
  });
});

describe('getPeriodPresetRange', () => {
  const rows = [
    { date: '2026-03-01' }, { date: '2026-03-15' }, { date: '2026-03-30' },
  ].map(r => ({ ...r, user: '', kind: '', model: '', maxMode: '', inputCache: 0, inputNoCache: 0, cacheRead: 0, output: 0, total: 0, cost: 0 }));

  it('returns full range for all', () => {
    expect(getPeriodPresetRange('all', rows)).toEqual({ from: '2026-03-01', to: '2026-03-30' });
  });
});

describe('pctChange and previous period', () => {
  it('computes percent change', () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(0, 0)).toBe(0);
  });

  it('finds previous period rows', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, '0')}`,
      user: '', kind: '', model: '', maxMode: '',
      inputCache: 0, inputNoCache: 0, cacheRead: 0, output: 0, total: 0, cost: 1,
    }));
    const prev = getPreviousPeriodRows(rows, '2026-03-06', '2026-03-10');
    expect(prev.length).toBeGreaterThan(0);
    expect(prev.every(r => r.date < '2026-03-06')).toBe(true);
  });
});

describe('computeTotals', () => {
  it('sums metrics', () => {
    const rows = [
      { cost: 1.5, total: 100, output: 40 },
      { cost: 0.5, total: 200, output: 60 },
    ];
    const t = computeTotals(rows);
    expect(t.totalCost).toBe(2);
    expect(t.totalRequests).toBe(2);
    expect(t.totalTokens).toBe(300);
  });
});

import { describe, expect, it } from 'vitest';
import {
  allocationContribution,
  allocationPlanned,
  formatPercent,
  getAdjustmentIds,
  sumIncomes,
} from './allocations';
import type { ExpenseCategoryAllocation } from '@/types/budget';

let seq = 0;
function alloc(
  overrides: Partial<ExpenseCategoryAllocation> & Pick<ExpenseCategoryAllocation, 'expense_category_id' | 'income_category_id'>,
): ExpenseCategoryAllocation {
  seq += 1;
  return {
    id: `a${seq}`,
    user_id: 'u',
    allocation_type: 'fixed',
    allocation_value: 100,
    created_at: `2026-10-03T16:${String(seq).padStart(2, '0')}:00Z`,
    ...overrides,
  };
}

describe('getAdjustmentIds without the is_adjustment column', () => {
  it('treats fixed rows next to a percentage from the same source as top-ups', () => {
    const base = alloc({ expense_category_id: 'cafe', income_category_id: 'salary', allocation_type: 'percentage', allocation_value: 7 });
    const topUp = alloc({ expense_category_id: 'cafe', income_category_id: 'salary', allocation_value: 6152 });
    const otherSource = alloc({ expense_category_id: 'cafe', income_category_id: 'advance', allocation_type: 'percentage', allocation_value: 6 });

    expect(getAdjustmentIds([base, topUp, otherSource])).toEqual(new Set([topUp.id]));
  });

  it('keeps the oldest fixed row as the base when the pair has no percentage', () => {
    const base = alloc({ expense_category_id: 'zhku', income_category_id: 'salary', allocation_value: 9911 });
    const topUp = alloc({ expense_category_id: 'zhku', income_category_id: 'salary', allocation_value: 500 });

    expect(getAdjustmentIds([topUp, base])).toEqual(new Set([topUp.id]));
  });

  it('leaves fixed amounts from different sources alone', () => {
    const rows = [
      alloc({ expense_category_id: 'cat', income_category_id: 'advance', allocation_value: 2000 }),
      alloc({ expense_category_id: 'cat', income_category_id: 'salary', allocation_value: 5000 }),
    ];

    expect(getAdjustmentIds(rows).size).toBe(0);
  });

  it('finds every top-up when the form re-saved rows with the same timestamp', () => {
    const at = '2026-10-03T17:00:00Z';
    const topUp = alloc({ expense_category_id: 'x', income_category_id: 's', allocation_value: 13, created_at: at });
    const base = alloc({ expense_category_id: 'x', income_category_id: 's', allocation_type: 'percentage', allocation_value: 12, created_at: at });

    expect(getAdjustmentIds([topUp, base])).toEqual(new Set([topUp.id]));
  });
});

describe('getAdjustmentIds with the is_adjustment column', () => {
  it('trusts the flag, including a top-up from a source the category had no other row for', () => {
    const base = alloc({ expense_category_id: 'abkhazia', income_category_id: 'salary', allocation_value: 20000, is_adjustment: false });
    const topUp = alloc({ expense_category_id: 'abkhazia', income_category_id: 'advance', allocation_value: 1500, is_adjustment: true });
    const lookalike = alloc({ expense_category_id: 'abkhazia', income_category_id: 'salary', allocation_value: 300, is_adjustment: false });

    expect(getAdjustmentIds([base, topUp, lookalike])).toEqual(new Set([topUp.id]));
  });
});

describe('sumIncomes', () => {
  const rates: Record<string, number> = { USD: 90, GEL: 33 };
  const toRub = (amount: number, currency: string) => (rates[currency] ? amount * rates[currency] : null);

  it('converts foreign incomes into the profile currency', () => {
    const result = sumIncomes(
      [
        { amount: 100000, currency: 'RUB', category_id: 'salary' },
        { amount: 500, currency: 'USD', category_id: 'salary' },
        { amount: 1000, currency: 'GEL', category_id: 'advance' },
      ],
      'RUB',
      toRub,
    );

    expect(result.byCategory).toEqual({ salary: 145000, advance: 33000 });
    expect(result.total).toBe(178000);
    expect(result.missingRates).toEqual([]);
  });

  it('leaves out incomes without a known rate and reports their currency', () => {
    const result = sumIncomes(
      [
        { amount: 1000, currency: 'RUB', category_id: 'salary' },
        { amount: 50, currency: 'AMD', category_id: 'salary' },
      ],
      'RUB',
      toRub,
    );

    expect(result.total).toBe(1000);
    expect(result.missingRates).toEqual(['AMD']);
  });

  it('treats a missing currency and category as the defaults', () => {
    const result = sumIncomes([{ amount: 700, currency: '', category_id: null }], 'RUB', toRub);

    expect(result.byCategory).toEqual({ uncategorized: 700 });
  });
});

describe('allocation amounts', () => {
  const percent = { allocation_type: 'percentage' as const, allocation_value: 10 };
  const fixed = { allocation_type: 'fixed' as const, allocation_value: 45000 };

  it('takes a share of the source for percentages', () => {
    expect(allocationContribution(percent, 200000)).toBe(20000);
    expect(allocationPlanned(percent, 200000)).toBe(20000);
  });

  it('caps a fixed amount by the source when counting what is allocated', () => {
    expect(allocationContribution(fixed, 30000)).toBe(30000);
  });

  it('shows the full fixed amount on the card while the source has income', () => {
    expect(allocationPlanned(fixed, 30000)).toBe(45000);
  });

  it('shows zero for every allocation while the source is empty', () => {
    expect(allocationPlanned(fixed, 0)).toBe(0);
    expect(allocationPlanned(percent, 0)).toBe(0);
    expect(allocationContribution(fixed, 0)).toBe(0);
  });
});

describe('formatPercent', () => {
  it('keeps meaningful decimals with a Russian comma', () => {
    expect(formatPercent(4.8)).toBe('4,8%');
    expect(formatPercent(11.52)).toBe('11,52%');
    expect(formatPercent(13)).toBe('13%');
    expect(formatPercent(2.499)).toBe('2,5%');
  });
});

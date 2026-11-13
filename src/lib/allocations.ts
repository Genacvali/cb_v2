import { ExpenseCategoryAllocation, Income } from '@/types/budget';

type AllocationLike = Pick<
  ExpenseCategoryAllocation,
  'id' | 'expense_category_id' | 'income_category_id' | 'allocation_type' | 'allocation_value' | 'created_at' | 'is_adjustment'
>;

/**
 * Top-ups added by «Распределить». Uses the `is_adjustment` column once the
 * migration is applied. Before that, falls back to the data: extra fixed rows
 * for an income source that already funds the same expense category. If the
 * pair has a percentage row, every fixed row next to it is a top-up;
 * otherwise the oldest fixed row is the base.
 */
export function getAdjustmentIds(allocations: AllocationLike[]): Set<string> {
  if (allocations.some(a => typeof a.is_adjustment === 'boolean')) {
    return new Set(allocations.filter(a => a.is_adjustment).map(a => a.id));
  }

  const groups = new Map<string, AllocationLike[]>();
  for (const a of allocations) {
    const key = `${a.expense_category_id}:${a.income_category_id}`;
    const list = groups.get(key);
    if (list) list.push(a);
    else groups.set(key, [a]);
  }

  const ids = new Set<string>();
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const fixed = rows
      .filter(a => a.allocation_type === 'fixed')
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    const hasPercentage = fixed.length < rows.length;
    fixed.slice(hasPercentage ? 0 : 1).forEach(a => ids.add(a.id));
  }
  return ids;
}

/** Converts `amount` from `currency` into the profile currency; null when no rate is known. */
export type ToBaseCurrency = (amount: number, currency: string) => number | null;

export interface IncomeTotals {
  byCategory: Record<string, number>;
  total: number;
  /** Currencies whose incomes were left out because no rate was available. */
  missingRates: string[];
}

export function sumIncomes(
  incomes: Pick<Income, 'amount' | 'currency' | 'category_id'>[],
  baseCurrency: string,
  toBase: ToBaseCurrency,
): IncomeTotals {
  const byCategory: Record<string, number> = {};
  const missing = new Set<string>();
  let total = 0;
  for (const inc of incomes) {
    const currency = inc.currency || baseCurrency;
    const amount = currency === baseCurrency
      ? Number(inc.amount)
      : toBase(Number(inc.amount), currency);
    if (amount === null) {
      missing.add(currency);
      continue;
    }
    const catId = inc.category_id || 'uncategorized';
    byCategory[catId] = (byCategory[catId] || 0) + amount;
    total += amount;
  }
  return { byCategory, total, missingRates: [...missing] };
}

const percentFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

/** 4.8 → «4,8%», 12 → «12%». */
export function formatPercent(value: number): string {
  return `${percentFormat.format(Number(value))}%`;
}

/** Money an allocation actually takes from its source; fixed amounts are capped by the source income. */
export function allocationContribution(
  a: Pick<ExpenseCategoryAllocation, 'allocation_type' | 'allocation_value'>,
  sourceIncome: number,
): number {
  return a.allocation_type === 'percentage'
    ? sourceIncome * Number(a.allocation_value) / 100
    : Math.min(Number(a.allocation_value), sourceIncome);
}

/** Amount shown on the category card: the full fixed amount, or nothing while the source is empty. */
export function allocationPlanned(
  a: Pick<ExpenseCategoryAllocation, 'allocation_type' | 'allocation_value'>,
  sourceIncome: number,
): number {
  if (sourceIncome <= 0) return 0;
  return a.allocation_type === 'percentage'
    ? sourceIncome * Number(a.allocation_value) / 100
    : Number(a.allocation_value);
}

import { ExpenseCategoryAllocation } from '@/types/budget';

/**
 * Top-ups added by «Распределить»: extra fixed rows for an income source that
 * already funds the same expense category. If the pair has a percentage row,
 * every fixed row next to it is a top-up; otherwise the oldest fixed row is the base.
 */
export function getAdjustmentIds(allocations: ExpenseCategoryAllocation[]): Set<string> {
  const groups = new Map<string, ExpenseCategoryAllocation[]>();
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

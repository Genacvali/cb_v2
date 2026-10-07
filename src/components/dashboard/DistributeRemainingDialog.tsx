import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { ExpenseCategory, ExpenseCategoryAllocation, IncomeCategory } from '@/types/budget';
import { useAddAllocation, useDeleteAllocation, useUpdateAllocation } from '@/hooks/useAllocations';
import { useFormatMoney } from '@/hooks/useCurrencies';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Wand2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Positive — unallocated income. Negative — allocations exceed income. */
  balance: number;
  expenseCategories: ExpenseCategory[];
  incomeCategories: IncomeCategory[];
  allAllocations: ExpenseCategoryAllocation[];
  incomeByCategory: Record<string, number>;
}

export function DistributeRemainingDialog({
  open,
  onOpenChange,
  balance,
  expenseCategories,
  incomeCategories,
  allAllocations,
  incomeByCategory,
}: Props) {
  const addAllocation = useAddAllocation();
  const updateAllocation = useUpdateAllocation();
  const deleteAllocation = useDeleteAllocation();
  const { format: money } = useFormatMoney();
  const isCut = balance < -0.5;
  const gap = Math.abs(balance);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedIncomeId, setSelectedIncomeId] = useState<string>('');

  // Income categories that still have unallocated money
  const incomeCatsWithRemaining = useMemo(() =>
    incomeCategories
      .map(ic => {
        const total = incomeByCategory[ic.id] || 0;
        const allocated = allAllocations
          .filter(a => a.income_category_id === ic.id)
          .reduce((sum, a) => {
            return sum + (
              a.allocation_type === 'percentage'
                ? total * a.allocation_value / 100
                : Math.min(a.allocation_value, total)
            );
          }, 0);
        return { ...ic, total, remaining: Math.max(total - allocated, 0) };
      })
      .filter(ic => ic.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining),
    [incomeCategories, incomeByCategory, allAllocations],
  );

  // Per-expense-category current totals (for proportional mode)
  const expenseCatAllocated = useMemo(() =>
    Object.fromEntries(
      expenseCategories.map(cat => {
        const total = allAllocations
          .filter(a => a.expense_category_id === cat.id)
          .reduce((sum, a) => {
            const src = incomeByCategory[a.income_category_id] || 0;
            return sum + (a.allocation_type === 'percentage'
              ? src * a.allocation_value / 100
              : Math.min(a.allocation_value, src));
          }, 0);
        return [cat.id, total];
      }),
    ),
    [expenseCategories, allAllocations, incomeByCategory],
  );

  // Reset state when dialog opens (intentionally only on `open` change)
  useEffect(() => {
    if (!open) return;
    setAmounts({});
    setSelectedIds(new Set());
    if (incomeCatsWithRemaining.length > 0) {
      setSelectedIncomeId(incomeCatsWithRemaining[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedIncomeRemaining = useMemo(() => {
    const ic = incomeCatsWithRemaining.find(ic => ic.id === selectedIncomeId);
    return ic?.remaining ?? gap;
  }, [incomeCatsWithRemaining, selectedIncomeId, gap]);

  const budget = isCut ? gap : Math.min(selectedIncomeRemaining, gap);
  const totalAssigned = Object.values(amounts).reduce((s, v) => s + (v || 0), 0);
  const exceedsBudget = totalAssigned > budget + 0.5;
  const exceedsCategory = isCut && Object.entries(amounts).some(
    ([id, value]) => value > Math.floor(expenseCatAllocated[id] || 0) + 0.5,
  );
  const blocked = exceedsBudget || exceedsCategory;

  // Empty selection means "all categories" — the previous behaviour.
  // A non-empty selection limits even/proportional fill to those rows.
  const targets = selectedIds.size > 0
    ? expenseCategories.filter(cat => selectedIds.has(cat.id))
    : expenseCategories;
  const allSelected = expenseCategories.length > 0 && selectedIds.size === expenseCategories.length;

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const capOf = (id: string) => (isCut ? Math.floor(expenseCatAllocated[id] || 0) : Number.POSITIVE_INFINITY);

  /** Split `budget` across categories. In cut mode each share is capped by what the category currently has. */
  const split = (cats: ExpenseCategory[], mode: 'even' | 'proportional') => {
    const usable = cats.filter(cat => capOf(cat.id) > 0);
    if (usable.length === 0) {
      toast.error(isCut ? 'В выбранных категориях нечего уменьшить' : 'Нет категорий');
      return;
    }
    const result: Record<string, number> = {};
    let left = Math.round(budget);

    if (mode === 'proportional') {
      const totalCurrent = usable.reduce((s, cat) => s + Math.min(capOf(cat.id), expenseCatAllocated[cat.id] || 0), 0);
      if (totalCurrent <= 0) {
        split(usable, 'even');
        return;
      }
      const sorted = [...usable].sort(
        (a, b) => (expenseCatAllocated[b.id] || 0) - (expenseCatAllocated[a.id] || 0),
      );
      sorted.forEach((cat, i) => {
        const room = capOf(cat.id);
        const share = i === sorted.length - 1
          ? left
          : Math.floor(Math.round(budget) * (expenseCatAllocated[cat.id] || 0) / totalCurrent);
        const take = Math.max(0, Math.min(room, share, left));
        result[cat.id] = take;
        left -= take;
      });
      for (const cat of sorted) {
        if (left <= 0) break;
        const room = capOf(cat.id) - (result[cat.id] || 0);
        const take = Math.min(Math.max(room, 0), left);
        if (take <= 0) continue;
        result[cat.id] = (result[cat.id] || 0) + take;
        left -= take;
      }
    } else if (!isCut) {
      const perCat = Math.floor(Math.round(budget) / usable.length);
      usable.forEach((cat, i) => {
        result[cat.id] = i === 0
          ? Math.round(budget) - perCat * (usable.length - 1)
          : perCat;
      });
      left = 0;
    } else {
      let pool = [...usable];
      let guard = 0;
      while (left > 0 && pool.length > 0 && guard < 30) {
        guard += 1;
        const share = Math.max(1, Math.floor(left / pool.length));
        const next: ExpenseCategory[] = [];
        for (const cat of pool) {
          if (left <= 0) break;
          const room = capOf(cat.id) - (result[cat.id] || 0);
          if (room <= 0) continue;
          const take = Math.min(room, share, left);
          result[cat.id] = (result[cat.id] || 0) + take;
          left -= take;
          if (room - take > 0) next.push(cat);
        }
        pool = next;
      }
    }

    if (isCut && left > 0) {
      toast.error('В выбранных категориях не хватает суммы, чтобы снять весь перерасход');
    }
    setAmounts(result);
  };

  const handleEven = () => split(targets, 'even');
  const handleProportional = () => split(targets, 'proportional');

  const contribution = (allocation: ExpenseCategoryAllocation) => {
    const src = incomeByCategory[allocation.income_category_id] || 0;
    return allocation.allocation_type === 'percentage'
      ? src * allocation.allocation_value / 100
      : Math.min(allocation.allocation_value, src);
  };

  const applyCut = async (expenseCategoryId: string, cut: number) => {
    let left = cut;
    const rows = allAllocations
      .filter(a => a.expense_category_id === expenseCategoryId)
      .map(a => ({ allocation: a, contrib: contribution(a) }))
      .filter(row => row.contrib > 0)
      .sort((a, b) => b.contrib - a.contrib);

    for (const { allocation, contrib } of rows) {
      if (left <= 0.5) break;
      const reduceMoney = Math.min(left, contrib);
      const src = incomeByCategory[allocation.income_category_id] || 0;
      let newValue: number;
      if (allocation.allocation_type === 'percentage') {
        if (src <= 0) continue;
        newValue = Math.max(0, allocation.allocation_value - (reduceMoney / src) * 100);
        newValue = Math.round(newValue * 100) / 100;
      } else {
        // Counted amount is capped by the income source, so shrink that part.
        const counted = Math.min(allocation.allocation_value, src);
        newValue = Math.max(0, Math.round((counted - reduceMoney) * 100) / 100);
      }
      if (newValue <= 0) await deleteAllocation.mutateAsync(allocation.id);
      else await updateAllocation.mutateAsync({ id: allocation.id, allocation_value: newValue });
      left -= reduceMoney;
    }
  };

  const saving = addAllocation.isPending || updateAllocation.isPending || deleteAllocation.isPending;

  const handleSave = async () => {
    const entries = Object.entries(amounts).filter(([, v]) => v > 0);
    if (entries.length === 0) { onOpenChange(false); return; }
    if (blocked) return;
    if (!isCut && !selectedIncomeId) { toast.error('Выберите источник дохода'); return; }
    try {
      if (isCut) {
        for (const [catId, amount] of entries) {
          await applyCut(catId, amount);
        }
        toast.success('Перерасход снят');
      } else {
        for (const [catId, amount] of entries) {
          await addAllocation.mutateAsync({
            expense_category_id: catId,
            income_category_id: selectedIncomeId,
            allocation_type: 'fixed',
            allocation_value: amount,
          });
        }
        toast.success('Остаток распределён');
      }
      onOpenChange(false);
    } catch {
      toast.error('Ошибка при сохранении');
    }
  };

  const setAmount = (catId: string, raw: string) => {
    const val = Math.max(0, Number(raw) || 0);
    setAmounts(prev => ({ ...prev, [catId]: val }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            {isCut ? 'Снять перерасход' : 'Распределить остаток'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Available amount */}
          <div className={cn(
            'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm',
            isCut ? 'bg-destructive/10 text-destructive' : 'bg-secondary/50',
          )}>
            <span className={isCut ? '' : 'text-muted-foreground'}>
              {isCut ? 'Перерасход' : 'Нераспределено'}
            </span>
            <span className="font-semibold tabular-nums">
              {money(Math.round(budget))}
            </span>
          </div>

          {isCut && (
            <p className="text-xs text-muted-foreground">
              Сумма спишется с текущих распределений выбранных категорий. Новая категория при этом не уменьшится, если её не отмечать.
            </p>
          )}

          {/* Income source selector (only when adding leftover from several sources) */}
          {!isCut && incomeCatsWithRemaining.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Источник дохода</p>
              <Select value={selectedIncomeId} onValueChange={setSelectedIncomeId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {incomeCatsWithRemaining.map(ic => (
                    <SelectItem key={ic.id} value={ic.id}>
                      {ic.name} — {money(Math.round(ic.remaining))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {selectedIds.size > 0
                ? `Выбрано ${selectedIds.size} из ${expenseCategories.length} — только они`
                : isCut
                  ? 'Ничего не выбрано — спишется со всех, где есть сумма'
                  : 'Ничего не выбрано — распределится по всем'}
            </span>
            <span className="flex shrink-0 gap-3">
              {!allSelected && (
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={() => setSelectedIds(new Set(expenseCategories.map(c => c.id)))}
                >
                  Все
                </button>
              )}
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Снять
                </button>
              )}
            </span>
          </div>

          {/* Quick-fill: all categories, or only the checked ones */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleEven}
              disabled={targets.length === 0}
            >
              Поровну
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleProportional}
              disabled={targets.length === 0}
            >
              Пропорционально
            </Button>
          </div>

          {/* Per-category inputs */}
          <div className="space-y-1.5">
            {expenseCategories.map(cat => {
              const checked = selectedIds.has(cat.id);
              return (
                <div
                  key={cat.id}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-1.5 py-1 -mx-1.5',
                    checked && 'bg-primary/10',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSelected(cat.id)}
                    aria-label={`Выбрать ${cat.name}`}
                  />
                  <button
                    type="button"
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    onClick={() => toggleSelected(cat.id)}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary/50 shrink-0">
                      <CategoryIcon icon={cat.icon} className="text-sm" />
                    </div>
                    <span className="flex-1 min-w-0">
                      <span className="text-sm block truncate">{cat.name}</span>
                      {isCut && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          сейчас {money(Math.round(expenseCatAllocated[cat.id] || 0))}
                        </span>
                      )}
                    </span>
                  </button>
                  <Input
                    type="number"
                    min={0}
                    value={amounts[cat.id] || ''}
                    onChange={e => setAmount(cat.id, e.target.value)}
                    className={cn(
                      'h-7 w-28 text-right tabular-nums text-sm shrink-0',
                      isCut && (amounts[cat.id] || 0) > Math.floor(expenseCatAllocated[cat.id] || 0) + 0.5 && 'border-destructive',
                    )}
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>

          {/* Running total */}
          <div className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 transition-colors ${
            blocked ? 'bg-destructive/10 text-destructive' : 'bg-secondary/50'
          }`}>
            <span className={blocked ? '' : 'text-muted-foreground'}>
              {exceedsCategory
                ? 'Больше, чем в категории'
                : exceedsBudget
                  ? (isCut ? 'Больше перерасхода' : 'Превышает остаток')
                  : (isCut ? 'Списывается' : 'Назначено')}
            </span>
            <span className="font-medium tabular-nums">
              {Math.round(totalAssigned).toLocaleString('ru-RU')} / {money(Math.round(budget))}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={totalAssigned === 0 || blocked || saving}
          >
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

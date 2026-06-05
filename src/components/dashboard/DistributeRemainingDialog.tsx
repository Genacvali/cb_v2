import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { ExpenseCategory, ExpenseCategoryAllocation, IncomeCategory } from '@/types/budget';
import { useAddAllocation } from '@/hooks/useAllocations';
import { toast } from 'sonner';
import { Wand2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingTotal: number;
  expenseCategories: ExpenseCategory[];
  incomeCategories: IncomeCategory[];
  allAllocations: ExpenseCategoryAllocation[];
  incomeByCategory: Record<string, number>;
}

export function DistributeRemainingDialog({
  open,
  onOpenChange,
  remainingTotal,
  expenseCategories,
  incomeCategories,
  allAllocations,
  incomeByCategory,
}: Props) {
  const addAllocation = useAddAllocation();
  const [amounts, setAmounts] = useState<Record<string, number>>({});
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
            return sum + (a.allocation_type === 'percentage' ? src * a.allocation_value / 100 : a.allocation_value);
          }, 0);
        return [cat.id, total];
      }),
    ),
    [expenseCategories, allAllocations, incomeByCategory],
  );

  // Reset state when dialog opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    setAmounts({});
    if (incomeCatsWithRemaining.length > 0) {
      setSelectedIncomeId(incomeCatsWithRemaining[0].id);
    }
  }, [open]);

  const selectedIncomeRemaining = useMemo(() => {
    const ic = incomeCatsWithRemaining.find(ic => ic.id === selectedIncomeId);
    return ic?.remaining ?? remainingTotal;
  }, [incomeCatsWithRemaining, selectedIncomeId, remainingTotal]);

  const budget = Math.min(selectedIncomeRemaining, remainingTotal);
  const totalAssigned = Object.values(amounts).reduce((s, v) => s + (v || 0), 0);
  const overspent = totalAssigned > budget;

  const handleEven = () => {
    if (expenseCategories.length === 0) return;
    const perCat = Math.floor(budget / expenseCategories.length);
    const newAmounts: Record<string, number> = {};
    expenseCategories.forEach((cat, i) => {
      newAmounts[cat.id] = i === 0
        ? budget - perCat * (expenseCategories.length - 1)
        : perCat;
    });
    setAmounts(newAmounts);
  };

  const handleProportional = () => {
    const totalCurrent = Object.values(expenseCatAllocated).reduce((s, v) => s + v, 0);
    if (totalCurrent === 0) { handleEven(); return; }

    const newAmounts: Record<string, number> = {};
    let leftover = budget;
    const sorted = [...expenseCategories].sort(
      (a, b) => (expenseCatAllocated[b.id] || 0) - (expenseCatAllocated[a.id] || 0),
    );
    sorted.forEach((cat, i) => {
      if (i === sorted.length - 1) {
        newAmounts[cat.id] = Math.max(leftover, 0);
      } else {
        const ratio = (expenseCatAllocated[cat.id] || 0) / totalCurrent;
        const amount = Math.floor(budget * ratio);
        newAmounts[cat.id] = amount;
        leftover -= amount;
      }
    });
    setAmounts(newAmounts);
  };

  const handleSave = async () => {
    const entries = Object.entries(amounts).filter(([, v]) => v > 0);
    if (entries.length === 0) { onOpenChange(false); return; }
    if (!selectedIncomeId) { toast.error('Выберите источник дохода'); return; }
    try {
      for (const [catId, amount] of entries) {
        await addAllocation.mutateAsync({
          expense_category_id: catId,
          income_category_id: selectedIncomeId,
          allocation_type: 'fixed',
          allocation_value: amount,
        });
      }
      toast.success('Остаток распределён');
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
            Распределить остаток
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Available amount */}
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Нераспределено</span>
            <span className="font-semibold tabular-nums">
              {Math.round(budget).toLocaleString('ru-RU')} ₽
            </span>
          </div>

          {/* Income source selector (only when multiple sources have remaining) */}
          {incomeCatsWithRemaining.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Источник дохода</p>
              <Select value={selectedIncomeId} onValueChange={setSelectedIncomeId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {incomeCatsWithRemaining.map(ic => (
                    <SelectItem key={ic.id} value={ic.id}>
                      {ic.name} — {Math.round(ic.remaining).toLocaleString('ru-RU')} ₽
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quick-fill buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleEven}
            >
              Поровну
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleProportional}
            >
              Пропорционально
            </Button>
          </div>

          {/* Per-category inputs */}
          <div className="space-y-1.5">
            {expenseCategories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary/50 shrink-0">
                  <CategoryIcon icon={cat.icon} className="text-sm" />
                </div>
                <span className="text-sm flex-1 truncate min-w-0">{cat.name}</span>
                <Input
                  type="number"
                  min={0}
                  value={amounts[cat.id] || ''}
                  onChange={e => setAmount(cat.id, e.target.value)}
                  className="h-7 w-28 text-right tabular-nums text-sm shrink-0"
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          {/* Running total */}
          <div className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 transition-colors ${
            overspent ? 'bg-destructive/10 text-destructive' : 'bg-secondary/50'
          }`}>
            <span className={overspent ? '' : 'text-muted-foreground'}>
              {overspent ? 'Превышает остаток' : 'Назначено'}
            </span>
            <span className="font-medium tabular-nums">
              {Math.round(totalAssigned).toLocaleString('ru-RU')} / {Math.round(budget).toLocaleString('ru-RU')} ₽
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
            disabled={totalAssigned === 0 || overspent || addAllocation.isPending}
          >
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

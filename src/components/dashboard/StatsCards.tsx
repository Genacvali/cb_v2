import { useIncomeCategories } from '@/hooks/useBudget';
import { useAllAllocations } from '@/hooks/useAllocations';
import { useDisplayMoney } from '@/hooks/useExchangeRates';
import { useIncomeTotals } from '@/hooks/useIncomeTotals';
import { useFormatMoney } from '@/hooks/useCurrencies';
import { allocationContribution } from '@/lib/allocations';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export function StatsCards() {
  const { incomes, incomeByCategory, totalIncome, missingRates, hasForeign, ratesLoading, baseCurrency } = useIncomeTotals();
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: allAllocations = [] } = useAllAllocations();
  // Honours the dashboard "display currency" (converts via live rates when set)
  const { money } = useDisplayMoney();
  const { format } = useFormatMoney();

  const foreignTotals = useMemo(() => {
    const groups: Record<string, number> = {};
    incomes.forEach(inc => {
      const currency = inc.currency || baseCurrency;
      if (currency === baseCurrency) return;
      groups[currency] = (groups[currency] || 0) + Number(inc.amount);
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [incomes, baseCurrency]);

  const allocatedByIncomeCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const allocation of allAllocations) {
      const catId = allocation.income_category_id || 'uncategorized';
      totals[catId] = (totals[catId] || 0) + allocationContribution(allocation, incomeByCategory[catId] || 0);
    }
    return totals;
  }, [allAllocations, incomeByCategory]);

  const incomeCategoryMap = useMemo(
    () => new Map(incomeCategories.map(category => [category.id, category])),
    [incomeCategories],
  );

  const totalAllocated = Object.values(allocatedByIncomeCategory).reduce((sum, v) => sum + v, 0);
  const percent = totalIncome > 0 ? Math.round(totalAllocated / totalIncome * 100) : 0;
  const balance = totalIncome - totalAllocated;
  const overspend = balance < -0.5;

  const sources = Object.entries(incomeByCategory)
    .filter(([, total]) => total > 0)
    .map(([categoryId, total]) => {
      const category = incomeCategoryMap.get(categoryId);
      return {
        id: categoryId,
        name: category?.name || 'Без категории',
        icon: category?.icon || '💰',
        total,
        remaining: Math.max(total - (allocatedByIncomeCategory[categoryId] || 0), 0),
      };
    })
    .sort((a, b) => b.total - a.total);

  if (totalIncome <= 0 && !ratesLoading) {
    return (
      <Card className="glass-card mb-6 md:mb-8">
        <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm md:text-base">Доход ещё не добавлен</p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Введите сумму в блоке «Доход» — суммы по категориям посчитаются сами.
            </p>
            {missingRates.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                Нет курса {missingRates.join(', ')} — эти доходы пока не учтены
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card mb-6 md:mb-8">
      <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="min-w-0">
            <p className="text-xs md:text-sm text-muted-foreground">Доход</p>
            <p className="text-2xl md:text-3xl font-bold tabular-nums leading-tight">
              {ratesLoading ? 'Загружаем курс…' : money(totalIncome)}
            </p>
            {hasForeign && !ratesLoading && foreignTotals.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">
                в т.ч. по курсу: {foreignTotals.map(([currency, amount]) => format(amount, currency)).join(', ')}
              </p>
            )}
            {missingRates.length > 0 && !ratesLoading && (
              <p className="text-xs text-destructive">
                Нет курса {missingRates.join(', ')} — эти доходы пока не учтены
              </p>
            )}
          </div>

          <div className="flex gap-6 md:gap-10">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Распределено</p>
              <p className="text-base md:text-lg font-semibold tabular-nums">{money(totalAllocated)}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{overspend ? 'Перерасход' : 'Остаток'}</p>
              <p className={cn(
                'text-base md:text-lg font-semibold tabular-nums',
                overspend && 'text-destructive',
              )}>
                {money(Math.abs(balance) < 0.5 ? 0 : Math.abs(balance))}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div
            className="h-2 rounded-full bg-secondary overflow-hidden"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Распределено от дохода"
          >
            <div
              className={cn('h-full rounded-full transition-all', overspend ? 'bg-destructive' : 'bg-primary')}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <p className={cn('text-xs tabular-nums', overspend ? 'text-destructive' : 'text-muted-foreground')}>
            Распределено {percent}%
          </p>
        </div>

        {sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sources.map(source => (
              <div
                key={source.id}
                className="flex items-center gap-2 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs md:text-sm"
              >
                <CategoryIcon icon={source.icon} className="text-sm" />
                <span className="font-medium">{source.name}</span>
                <span className="tabular-nums">{money(source.total)}</span>
                <span className="text-muted-foreground tabular-nums">· осталось {money(source.remaining)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

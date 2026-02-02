import { useIncomes, useIncomeCategories } from '@/hooks/useBudget';
import { useAllAllocations } from '@/hooks/useAllocations';
import { useCurrencies, formatMoney } from '@/hooks/useCurrencies';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

export function StatsCards() {
  const { data: incomes = [] } = useIncomes();
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: allAllocations = [] } = useAllAllocations();
  const { data: currencies = [] } = useCurrencies();

  // Group incomes by currency
  const incomesByCurrency = useMemo(() => {
    const groups: Record<string, number> = {};
    incomes.forEach(inc => {
      const curr = inc.currency || 'RUB';
      groups[curr] = (groups[curr] || 0) + Number(inc.amount);
    });
    return groups;
  }, [incomes]);

  const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

  const incomeByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    incomes.forEach(inc => {
      const catId = inc.category_id || 'uncategorized';
      groups[catId] = (groups[catId] || 0) + Number(inc.amount);
    });
    return groups;
  }, [incomes]);

  const totalAllocatedAmount = useMemo(() => {
    let totalAllocated = 0;
    for (const allocation of allAllocations) {
      const sourceIncome = incomeByCategory[allocation.income_category_id] || 0;
      if (allocation.allocation_type === 'percentage') {
        totalAllocated += sourceIncome * allocation.allocation_value / 100;
      } else {
        totalAllocated += Math.min(allocation.allocation_value, sourceIncome);
      }
    }
    return totalAllocated;
  }, [allAllocations, incomeByCategory]);

  const totalAllocatedPercent = totalIncome > 0
    ? Math.round(totalAllocatedAmount / totalIncome * 100)
    : 0;

  const incomeCategoryMap = useMemo(() => {
    return new Map(incomeCategories.map(category => [category.id, category]));
  }, [incomeCategories]);

  const currencyByCategory = useMemo(() => {
    const totals: Record<string, Record<string, number>> = {};
    incomes.forEach(inc => {
      const catId = inc.category_id || 'uncategorized';
      const currency = inc.currency || 'RUB';
      if (!totals[catId]) totals[catId] = {};
      totals[catId][currency] = (totals[catId][currency] || 0) + Number(inc.amount);
    });

    const result: Record<string, string> = {};
    Object.entries(totals).forEach(([catId, currencyTotals]) => {
      const [topCurrency] = Object.entries(currencyTotals).sort((a, b) => b[1] - a[1])[0] || ['RUB'];
      result[catId] = topCurrency;
    });
    return result;
  }, [incomes]);

  const allocatedByIncomeCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const allocation of allAllocations) {
      const catId = allocation.income_category_id || 'uncategorized';
      const sourceIncome = incomeByCategory[catId] || 0;
      const amount = allocation.allocation_type === 'percentage'
        ? sourceIncome * allocation.allocation_value / 100
        : Math.min(allocation.allocation_value, sourceIncome);
      totals[catId] = (totals[catId] || 0) + amount;
    }
    return totals;
  }, [allAllocations, incomeByCategory]);

  // Format multi-currency display - show all currencies as array for flexible rendering
  const incomeEntries = useMemo(() => {
    const entries = Object.entries(incomesByCurrency);
    if (entries.length === 0) return [{ currency: 'RUB', amount: 0 }];
    // Show all currencies, sorted by amount descending
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([currency, amount]) => ({ currency, amount }));
  }, [incomesByCurrency]);

  const incomeCategoryCards = Object.entries(incomeByCategory)
    .filter(([, total]) => total > 0)
    .map(([categoryId, total]) => {
      const category = incomeCategoryMap.get(categoryId);
      const allocated = allocatedByIncomeCategory[categoryId] || 0;
      const remaining = Math.max(total - allocated, 0);
      const currency = currencyByCategory[categoryId] || 'RUB';
      return {
        id: categoryId,
        name: category?.name || 'Без категории',
        icon: category?.icon || '💰',
        color: category?.color,
        allocated,
        remaining,
        currency,
      };
    });

  return (
    <div className="grid gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
      <Card className="glass-card hover-lift overflow-hidden h-full">
        <CardContent className="p-2 md:p-6">
          <div className="flex flex-col items-center gap-1 md:gap-2">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
            <div className="text-center min-w-0 w-full">
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground leading-tight">
                Общий доход
              </p>
              <div className="flex flex-col items-center">
                {incomeEntries.slice(0, 2).map((entry) => (
                  <span
                    key={entry.currency}
                    className="text-sm md:text-lg font-bold leading-tight tabular-nums"
                  >
                    {formatMoney(entry.amount, entry.currency, currencies)}
                  </span>
                ))}
                {incomeEntries.length > 2 && (
                  <span className="text-[8px] md:text-xs text-muted-foreground">
                    +{incomeEntries.length - 2} валют
                  </span>
                )}
                {incomeEntries.length === 1 && (
                  <span className="text-[10px] md:text-xs text-muted-foreground">
                    Распределено: {totalAllocatedPercent}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {incomeCategoryCards.map((card) => (
        <Card key={card.id} className="glass-card hover-lift overflow-hidden h-full">
          <CardContent className="p-2 md:p-6">
            <div className="flex flex-col items-center gap-1 md:gap-2">
              <div
                className="w-8 h-8 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 bg-secondary/60"
                style={card.color ? { backgroundColor: card.color } : undefined}
              >
                <CategoryIcon icon={card.icon} className="text-base md:text-lg" />
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground leading-tight truncate">
                  {card.name}
                </p>
                <div className="mt-0.5 md:mt-1 space-y-0.5">
                  <p className="text-sm md:text-base font-bold tabular-nums">
                    {formatMoney(card.allocated, card.currency, currencies)}
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    Осталось {formatMoney(card.remaining, card.currency, currencies)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

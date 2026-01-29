import { useIncomes, useExpenseCategories } from '@/hooks/useBudget';
import { useCurrencies, formatMoney } from '@/hooks/useCurrencies';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Wallet, PieChart } from 'lucide-react';
import { useMemo } from 'react';

export function StatsCards() {
  const { data: incomes = [] } = useIncomes();
  const { data: expenseCategories = [] } = useExpenseCategories();
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

  const categoriesCount = expenseCategories.length;
  
  const totalAllocatedPercent = expenseCategories
    .filter(c => c.allocation_type === 'percentage')
    .reduce((sum, c) => sum + c.allocation_value, 0);

  // Format multi-currency display - show all currencies as array for flexible rendering
  const incomeEntries = useMemo(() => {
    const entries = Object.entries(incomesByCurrency);
    if (entries.length === 0) return [{ currency: 'RUB', amount: 0 }];
    // Show all currencies, sorted by amount descending
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([currency, amount]) => ({ currency, amount }));
  }, [incomesByCurrency]);

  const stats = [
    {
      title: 'Общий доход',
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Категорий',
      value: categoriesCount.toString(),
      icon: Wallet,
      gradient: 'from-blue-500 to-indigo-500',
    },
    {
      title: 'Распределено',
      value: `${totalAllocatedPercent}%`,
      icon: PieChart,
      gradient: 'from-violet-500 to-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5 md:gap-4 mb-3 md:mb-8">
      {stats.map((stat, idx) => (
        <Card key={stat.title} className="glass-card hover-lift overflow-hidden">
          <CardContent className="p-2 md:p-6">
            <div className="flex flex-col items-center gap-1 md:gap-2">
              <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                <stat.icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="text-[8px] md:text-sm font-medium text-muted-foreground leading-tight">
                  {stat.title}
                </p>
                {idx === 0 ? (
                  // Multi-currency income display - stacked
                  <div className="flex flex-col items-center">
                    {incomeEntries.slice(0, 2).map((entry) => (
                      <span 
                        key={entry.currency} 
                        className="text-[10px] md:text-xl font-bold leading-tight"
                      >
                        {formatMoney(entry.amount, entry.currency, currencies)}
                      </span>
                    ))}
                    {incomeEntries.length > 2 && (
                      <span className="text-[8px] md:text-xs text-muted-foreground">
                        +{incomeEntries.length - 2} валют
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs md:text-xl font-bold">{stat.value}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

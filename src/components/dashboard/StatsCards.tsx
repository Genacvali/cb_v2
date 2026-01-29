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

  // Format multi-currency display - show all currencies
  const incomeDisplay = useMemo(() => {
    const entries = Object.entries(incomesByCurrency);
    if (entries.length === 0) return '0 ₽';
    // Show all currencies, sorted by amount descending
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    return sorted.map(([currency, amount]) => formatMoney(amount, currency, currencies)).join(' / ');
  }, [incomesByCurrency, currencies]);

  const stats = [
    {
      title: 'Общий доход',
      value: incomeDisplay,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Категорий расходов',
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
    <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-8">
      {stats.map((stat) => (
        <Card key={stat.title} className="glass-card hover-lift overflow-hidden">
          <CardContent className="p-3 md:p-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between gap-2">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg flex-shrink-0 md:order-2`}>
                <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="text-center md:text-left md:order-1">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5 md:mb-1 leading-tight">
                  {stat.title}
                </p>
                <p className="text-sm md:text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

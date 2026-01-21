import { useIncomes, useExpenseCategories } from '@/hooks/useBudget';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Wallet, PieChart } from 'lucide-react';

export function StatsCards() {
  const { data: incomes = [] } = useIncomes();
  const { data: expenseCategories = [] } = useExpenseCategories();

  const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
  const categoriesCount = expenseCategories.length;
  
  const totalAllocatedPercent = expenseCategories
    .filter(c => c.allocation_type === 'percentage')
    .reduce((sum, c) => sum + c.allocation_value, 0);

  const stats = [
    {
      title: 'Общий доход',
      value: `${totalIncome.toLocaleString('ru-RU')} ₽`,
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

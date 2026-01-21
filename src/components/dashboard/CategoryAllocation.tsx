import { useExpenseCategories, useIncomes } from '@/hooks/useBudget';
import { useAllAllocations } from '@/hooks/useAllocations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/icons/CategoryIcon';

export function CategoryAllocation() {
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { data: incomes = [] } = useIncomes();
  const { data: allAllocations = [] } = useAllAllocations();

  // Calculate total income per income category
  const incomeByCategory = incomes.reduce((acc, inc) => {
    const catId = inc.category_id || 'uncategorized';
    acc[catId] = (acc[catId] || 0) + Number(inc.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

  // Calculate allocated amounts for each expense category
  const getCategoryAllocation = (categoryId: string) => {
    const categoryAllocations = allAllocations.filter(a => a.expense_category_id === categoryId);
    
    let totalAllocated = 0;
    for (const allocation of categoryAllocations) {
      const sourceIncome = incomeByCategory[allocation.income_category_id] || 0;
      if (allocation.allocation_type === 'percentage') {
        totalAllocated += (sourceIncome * allocation.allocation_value) / 100;
      } else {
        totalAllocated += allocation.allocation_value;
      }
    }
    return totalAllocated;
  };

  const totalAllocated = expenseCategories.reduce((sum, cat) => {
    return sum + getCategoryAllocation(cat.id);
  }, 0);

  const allocationPercent = totalIncome > 0 ? Math.round((totalAllocated / totalIncome) * 100) : 0;

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Распределение по категориям</CardTitle>
        <Badge variant={allocationPercent >= 100 ? 'default' : 'secondary'}>
          {allocationPercent}% распределено
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {expenseCategories.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Категории расходов не найдены
          </p>
        ) : (
          expenseCategories.map((cat) => {
            const amount = getCategoryAllocation(cat.id);
            const progressValue = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
            const categoryAllocations = allAllocations.filter(a => a.expense_category_id === cat.id);

            return (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <CategoryIcon icon={cat.icon} color={cat.color} className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium">{cat.name}</span>
                      {categoryAllocations.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {categoryAllocations.map((a, i) => (
                            <span key={a.id}>
                              {a.income_category?.name}: {a.allocation_type === 'percentage' ? `${a.allocation_value}%` : `${a.allocation_value.toLocaleString('ru-RU')}₽`}
                              {i < categoryAllocations.length - 1 && ' • '}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <span className="text-sm font-medium">
                    {amount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                
              <div className="flex items-center gap-3">
                  <Progress 
                    value={progressValue} 
                    className="h-2 flex-1"
                    indicatorColor={cat.color}
                    animated
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {Math.round(progressValue)}%
                  </span>
                </div>
              </div>
            );
          })
        )}

        {totalIncome > 0 && (
          <div className="pt-4 mt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Нераспределено</span>
              <span className="font-medium">
                {(totalIncome - totalAllocated).toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

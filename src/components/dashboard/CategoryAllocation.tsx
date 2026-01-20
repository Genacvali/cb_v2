import { useExpenseCategories, useIncomes, useUpdateExpenseCategory } from '@/hooks/useBudget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { Percent, Banknote } from 'lucide-react';
import { useState } from 'react';

export function CategoryAllocation() {
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { data: incomes = [] } = useIncomes();
  const updateCategory = useUpdateExpenseCategory();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

  const totalAllocatedPercent = expenseCategories
    .filter(c => c.allocation_type === 'percentage')
    .reduce((sum, c) => sum + c.allocation_value, 0);

  const handleUpdateValue = async (id: string) => {
    const value = parseFloat(editValue);
    if (isNaN(value)) return;
    
    await updateCategory.mutateAsync({ id, allocation_value: value });
    setEditingId(null);
    setEditValue('');
  };

  const toggleType = async (id: string, currentType: 'percentage' | 'fixed') => {
    const newType = currentType === 'percentage' ? 'fixed' : 'percentage';
    await updateCategory.mutateAsync({ 
      id, 
      allocation_type: newType,
      allocation_value: 0,
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Распределение по категориям</CardTitle>
        <Badge variant={totalAllocatedPercent === 100 ? 'default' : 'secondary'}>
          {totalAllocatedPercent}% распределено
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {expenseCategories.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Категории расходов не найдены
          </p>
        ) : (
          expenseCategories.map((cat) => {
            const amount = cat.allocation_type === 'percentage'
              ? (totalIncome * cat.allocation_value) / 100
              : cat.allocation_value;
            
            const progressValue = cat.allocation_type === 'percentage'
              ? cat.allocation_value
              : totalIncome > 0 ? (cat.allocation_value / totalIncome) * 100 : 0;

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
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 h-8"
                          placeholder="0"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateValue(cat.id)}
                          className="h-8"
                        >
                          ОК
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => toggleType(cat.id, cat.allocation_type)}
                        >
                          {cat.allocation_type === 'percentage' ? (
                            <Percent className="w-4 h-4" />
                          ) : (
                            <Banknote className="w-4 h-4" />
                          )}
                        </Button>
                        <button
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditValue(cat.allocation_value.toString());
                          }}
                          className="text-sm font-medium hover:underline"
                        >
                          {cat.allocation_type === 'percentage'
                            ? `${cat.allocation_value}%`
                            : `${cat.allocation_value.toLocaleString('ru-RU')} ₽`}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Progress 
                    value={progressValue} 
                    className="h-2 flex-1"
                    style={{ 
                      ['--progress-color' as any]: cat.color,
                    }}
                  />
                  <span className="text-sm text-muted-foreground w-24 text-right">
                    {amount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
